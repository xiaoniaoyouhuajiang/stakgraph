use crate::lang::Lang;
use crate::testing::test_backend::BackendTester;

#[tokio::test]
async fn test_python_flask() {
    let repo = Some("flask".to_string());
    let language = Lang::new_python();
    let tester = BackendTester::new(language, repo).await.unwrap();
    tester.test_backend().unwrap();
}
