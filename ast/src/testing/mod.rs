pub mod go;
pub mod python;
pub mod react_ts;
<<<<<<< HEAD
pub mod test_backend;

pub mod utils;

#[tokio::test]
async fn run_server_tests() {
    let repo = Some("go".to_string());
    let language = crate::lang::Lang::new_go();
    let tester = test_backend::BackendTester::new(language, repo)
        .await
        .unwrap();
    tester.test_backend().unwrap();
}
=======
pub mod ruby;
>>>>>>> e344f09 (enhancement: tested ruby parsing and added to mod.rs for compatibility with test_backend)
