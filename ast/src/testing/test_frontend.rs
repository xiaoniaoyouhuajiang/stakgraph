use crate::lang::graph::{Graph, Node};
use crate::lang::Lang;
use crate::repo::Repo;
use std::collections::HashMap;
use std::result::Result;
use tracing::info;

pub struct FrontendTester {
    graph: Graph,
    lang: Lang,
    repo: Option<String>,
}

impl FrontendTester {
    pub async fn new(lang: Lang, repo: Option<String>) -> Result<Self, anyhow::Error> {
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
            graph: repository
                .build_graph()
                .await
                .expect("Could not Build Graph"),
            lang,
            repo: Some(return_repo),
        })
    }

    pub fn test_frontend(&self) -> Result<(), anyhow::Error> {
        info!(
            "\n\nTesting frontend for {} at src/testing/{}\n\n",
            self.lang.kind.to_string().to_uppercase(),
            self.repo.as_ref().unwrap()
        );

        self.test_language()?;
        self.test_package_file()?;

        let expected_componets = vec!["NewPerson", "People"];
        let expected_requests = vec![("GET", "/people"), ("POST", "/person")];
        let expected_pages = vec!["/new-person", "/people"];
        let data_model = "Person";

        self.test_data_model(data_model)?;

        self.test_components(expected_componets)?;

        self.test_pages(expected_pages)?;

        self.test_requests(expected_requests)?;

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
            .filter(|node| matches!(node, Node::File(_)))
            .collect::<Vec<_>>();

        let package_files: Vec<_> = file_nodes
            .iter()
            .filter(|node| {
                let file_data = node.into_data();
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

    fn test_data_model(&self, data_model: &str) -> Result<(), anyhow::Error> {
        let data_model_nodes = self
            .graph
            .find_data_model_by(|node| node.name.contains(data_model));

        info!("✓ Found data model {}", data_model);

        assert!(
            !data_model_nodes.is_none(),
            "No data model found matching {}",
            data_model
        );

        Ok(())
    }

    fn test_components(&self, expected_components: Vec<&str>) -> Result<(), anyhow::Error> {
        let components = self
            .graph
            .nodes
            .iter()
            .filter(|node| matches!(node, Node::Function(_)))
            .collect::<Vec<_>>();

        let mut found_components: HashMap<String, bool> = expected_components
            .iter()
            .map(|component| (component.to_string(), false))
            .collect();

        for component in components {
            let component_data = component.into_data();
            if let Some(found) = found_components.get_mut(&component_data.name) {
                *found = true;
            }
        }

        for (component, found) in found_components.iter() {
            info!("✓ Found component {}", component);
            assert!(
                *found,
                "Component {} not found in graph",
                component.to_string()
            );
        }

        Ok(())
    }

    fn test_pages(&self, expected_pages: Vec<&str>) -> Result<(), anyhow::Error> {
        let pages = self
            .graph
            .nodes
            .iter()
            .filter(|node| matches!(node, Node::Page(_)))
            .collect::<Vec<_>>();

        let mut found_pages: HashMap<String, bool> = expected_pages
            .iter()
            .map(|page| (page.to_string(), false))
            .collect();

        for page in pages {
            let page_data = page.into_data();
            println!("\n{:?}\n", page_data);
            if let Some(found) = found_pages.get_mut(&page_data.name) {
                *found = true;
            }
        }

        for (page, found) in found_pages.iter() {
            info!("✓ Found page {}", page);
            assert!(*found, "Page {} not found in graph", page);
        }

        Ok(())
    }

    fn test_requests(&self, expected_requests: Vec<(&str, &str)>) -> Result<(), anyhow::Error> {
        let requests = self
            .graph
            .nodes
            .iter()
            .filter(|node| matches!(node, Node::Request(_)))
            .collect::<Vec<_>>();

        let mut found_requests: HashMap<(String, String), bool> = expected_requests
            .iter()
            .map(|request| ((request.0.to_string(), request.1.to_string()), false))
            .collect();

        for request in &requests {
            let request_data = request.into_data();

            let verb = match request_data.meta.get("verb") {
                Some(verb_value) => verb_value.to_uppercase(),
                None => "".to_string(),
            };

            let endpoint = extract_request_endpoint(&request_data.name);

            if let Some(found) = found_requests.get_mut(&(verb.clone(), endpoint.clone())) {
                *found = true;
            }

            info!(
                "✓ Found request: {} {} ({})",
                verb, endpoint, request_data.name
            );
        }

        for (request, found) in found_requests.iter() {
            info!("✓ Found request {:?}", request);
            assert!(*found, "Request {:?} not found in graph", request);
        }

        Ok(())
    }
}

fn extract_request_endpoint(url: &str) -> String {
    let path = url
        .split_terminator("/")
        .skip(3)
        .collect::<Vec<&str>>()
        .join("/");

    if path.is_empty() {
        return "/".to_string();
    }
    format!("/{}", path)
}
