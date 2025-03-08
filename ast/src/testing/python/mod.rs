use crate::lang::graph::{EdgeType, Node, NodeType};
use crate::{lang::Lang, repo::Repo};
use std::str::FromStr;

#[tokio::test]
async fn test_python(){
    crate::utils::logger();

    let repo = Repo::new("src/testing/python",
    Lang::from_str("python").unwrap(), false, 
    Vec::new(), 
    Vec::new()).unwrap();

    let graph = repo.build_graph().await.unwrap();
    assert_eq!(graph.nodes.len() , 26);
    assert_eq!(graph.edges.len() ,27);

    let languages = graph.nodes
    .iter()
    .filter(|n| matches!(n, Node::Language(_)))
    .collect::<Vec<_>>();
    assert_eq!(languages.len(), 1);

    let language = languages[0].into_data();
    assert_eq!(language.name, "python");
    assert_eq!(language.file, "src/testing/python/");

    let files = graph.nodes
    .iter()
    .filter(|n| matches!(n, Node::File(_)))
    .collect::<Vec<_>>();

    assert!(files.len() == 5);


    let imports = graph.nodes
    .iter()
    .filter(|n| matches!(n, Node::Import(_)))
    .collect::<Vec<_>>();

    assert_eq!(imports.len(), 4);


    let classes = graph.nodes
    .iter()
    .filter(|n| matches!(n, Node::Class(_)))
    .collect::<Vec<_>>();

    assert_eq!(classes.len(), 3);

    
    let class = classes[0].into_data();
    assert_eq!(class.name, "User");
    assert_eq!(class.file, "src/testing/python/model.py");

    let methods = graph.edges
    .iter()
    .filter(|e| matches!(e.edge, EdgeType::Operand) && e.source.node_type == NodeType::Class)
    .collect::<Vec<_>>();
    assert_eq!(methods.len(), 2);

    let data_models = graph.nodes
    .iter()
    .filter(|n| matches!(n, Node::DataModel(_)))
    .collect::<Vec<_>>();
    //Data models are zero because they are just classes in python
    assert_eq!(data_models.len(), 0);


    // Node::Endpoints does not recognize FASTAPI endpoints as endpoints, so we find them using Node::Function as regular functions in the routes.py file
    let route_functions = graph.nodes
        .iter()
        .filter(|n| matches!(n, Node::Function(_)) && 
               n.into_data().file == "src/testing/python/routes.py")
        .collect::<Vec<_>>();
    
    println!("Route functions count: {:?}", route_functions.len());
    assert_eq!(route_functions.len(), 2); 

    

    let endpoint = route_functions[0].into_data();
    assert_eq!(endpoint.name, "get_user");
    assert_eq!(endpoint.file, "src/testing/python/routes.py");

    let endpoint = route_functions[1].into_data();
    assert_eq!(endpoint.name, "create_user");
    assert_eq!(endpoint.file, "src/testing/python/routes.py");


}