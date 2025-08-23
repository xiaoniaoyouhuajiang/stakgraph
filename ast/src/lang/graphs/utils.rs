use super::NodeType;

pub fn tests_sources(tests_filter: Option<&str>) -> Vec<NodeType> {
    let unit = tests_filter
        .map(|s| s.eq_ignore_ascii_case("unit"))
        .unwrap_or(false);
    let e2e = tests_filter
        .map(|s| s.eq_ignore_ascii_case("e2e"))
        .unwrap_or(false);
    let both = tests_filter.is_none()
        || tests_filter
            .map(|s| s.eq_ignore_ascii_case("both"))
            .unwrap_or(false);
    if both || (!unit && !e2e) {
        return vec![NodeType::UnitTest, NodeType::E2eTest];
    }
    let mut sources = Vec::new();
    if unit {
        sources.push(NodeType::UnitTest);
    }
    if e2e {
        sources.push(NodeType::E2eTest);
    }
    sources
}
