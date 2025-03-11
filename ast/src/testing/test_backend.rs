use crate::utils::logger;
use tracing::info;

use crate::lang::graph::{EdgeType, Graph, Node};
use crate::lang::Lang;
use crate::repo::Repo;

pub struct BackendTester {
    graph: Graph,
    lang: Lang,
    repo: Option<String>,
}

impl BackendTester {
    pub async fn new(lang: Lang, repo: Option<String>) -> Result<Self, anyhow::Error> {
        logger();

        let language_name = lang.kind.clone();
        let language_in_repository = Lang::from_language(language_name.clone());
        let return_repo = match &repo {
            Some(repo) => repo.clone(),
            None => language_name.to_string(),
        };
        let repository = match repo {
            Some(repo) => Repo::new(
                &format!("src/testing/{}", repo.clone()),
                language_in_repository,
                false,
                Vec::new(),
                Vec::new(),
            )
            .unwrap(),
            None => Repo::new(
                &format!("src/testing/{}", language_name.to_string()),
                language_in_repository,
                false,
                Vec::new(),
                Vec::new(),
            )
            .unwrap(),
        };

        Ok(Self {
            graph: repository.build_graph().await?,
            lang,
            repo: Some(return_repo),
        })
    }

    pub fn test_backend(&self) -> Result<(), anyhow::Error> {
        info!(
            "\n\nTesting backend for {} at {}\n\n",
            self.lang.kind.to_string(),
            self.repo.as_ref().unwrap()
        );

        self.test_language()?;
        self.test_package_file()?;

        let data_model = "Person";

        self.test_data_model(data_model)?;

        let expected_endpoints = vec![("GET", "person/:param"), ("POST", "person")];

        self.test_endpoints(expected_endpoints.clone())?;

        self.test_handler_functions(expected_endpoints, data_model)?;

        Ok(())
    }

    fn test_language(&self) -> Result<(), anyhow::Error> {
        let language_nodes = self.graph.find_languages();

        let language_node = language_nodes
            .iter()
            .find(|node| node.into_data().name == self.lang.kind.to_string())
            .unwrap();

        assert_eq!(
            language_node.into_data().name,
            self.lang.kind.to_string(),
            "Language node name mismatch"
        );
        Ok(())
    }

    fn test_package_file(&self) -> Result<(), anyhow::Error> {
        let package_file_name = self.lang.kind.pkg_file();

        let file_nodes = self
            .graph
            .nodes
            .iter()
            .filter(|n| matches!(n, Node::File(_)))
            .collect::<Vec<_>>();

        let package_files: Vec<_> = file_nodes
            .iter()
            .filter(|n| {
                let file_data = n.into_data();
                file_data.name.contains(&package_file_name)
            })
            .collect();

        assert!(
            !package_files.is_empty(),
            "No package file found matching {}",
            package_file_name
        );

        info!("✓ Found package file {}", package_file_name);

        Ok(())
    }

    fn test_data_model(&self, name: &str) -> Result<(), anyhow::Error> {
        let data_model = self.graph.find_data_model_by(|node| node.name == name);

        match data_model {
            Some(_) => {
                info!("✓ Found data model {}", name);
                Ok(())
            }
            None => {
                anyhow::bail!("Data model {} not found", name);
            }
        }
    }

    fn test_endpoints(&self, endpoints: Vec<(&str, &str)>) -> Result<(), anyhow::Error> {
        for (method, path) in endpoints {
            let normalized_expected_path = normalize_path(path);

            let endpoint = self
                .graph
                .find_specific_endpoints(method, &normalized_expected_path);

            match endpoint {
                Some(_) => {
                    info!("✓ Found endpoint {} {}", method, path);
                }
                None => {
                    anyhow::bail!("Endpoint {} {} not found", method, path);
                }
            }

            assert!(endpoint.is_some(), "Endpoint {} {} not found", method, path);
        }

        Ok(())
    }

    fn test_handler_functions(
        &self,
        expected_enpoints: Vec<(&str, &str)>,
        data_model: &str,
    ) -> Result<(), anyhow::Error> {
        for (verb, path) in expected_enpoints {
            let normalized_expected_path = normalize_path(path);

            let endpoint = self
                .graph
                .find_specific_endpoints(verb, &normalized_expected_path)
                .unwrap();
            let handler = self
                .graph
                .find_target_by_edge_type(&endpoint, EdgeType::Handler);

            match handler {
                Some(endpoint_handler) => {
                    let formatted_handler =
                        normalize_function_name(&endpoint_handler.into_data().name.as_str());

                    info!("✓ Found handler {}", formatted_handler);

                    let triggered_functions = self
                        .graph
                        .find_functions_called_by_handler(&endpoint_handler);

                    for triggered_function in triggered_functions {
                        let contains_data_model = self.graph.edges.iter().any(|edge| {
                            edge.edge == EdgeType::Contains
                                && edge.target.node_data.name == data_model
                                && edge.source.node_data.name == triggered_function.into_data().name
                            //FIXME: Fails for Python flask because between handler and data model there is a function call run a session of the database
                        });

                        info!("✓ Function contains {} Data Model", data_model);

                        assert!(
                            contains_data_model,
                            "Does not contain data model {}",
                            data_model
                        );
                    }
                }
                None => anyhow::bail!("Handler not found for endpoint {}", path),
            }
        }

        Ok(())
    }
}

fn normalize_path(path: &str) -> String {
    if path.starts_with("/") {
        path.to_string()
    } else {
        format!("/{}", path)
    }
}
fn normalize_function_name(name: &str) -> String {
    name.replace('_', "").to_lowercase()
}
