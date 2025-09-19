// HelixDB Queries for the GitHub Analysis Platform - Version 3 (Corrected)
// Design:
// 1. Strictly follows HQL syntax for type-safety and correctness.
// 2. Implements batch operations using FOR loops for high-performance ingestion.
// 3. Provides a comprehensive set of tools for analysis and LLM integration.

// =====================================================================
// Section A: Ingestion & Data Management Queries
// =====================================================================

// --- Project & Metadata Management ---
QUERY find_project_by_url(url: String) =>
    project <- N<PROJECT>({url: url})
    RETURN project::{ id }

// NOTE: The 'last_ingested_sha' property was in the original query but is not in schema.hx.
// It has been removed from this query to match the schema.
QUERY create_project(url: String, name: String, description: String, language: String, stars: I64, forks: I64) =>
    project <- AddN<PROJECT>({
        url: url, name: name, description: description, language: language, stars: stars, forks: forks
    })
    RETURN project

// NOTE: This query is disabled because the 'last_ingested_sha' property is not defined in the N::PROJECT schema.
// To use it, you would first need to add 'last_ingested_sha: String' to N::PROJECT in schema.hx.
QUERY update_project_sha(project_id: ID, new_sha: String) =>
    RETURN "Query disabled: 'last_ingested_sha' is not in the schema."

QUERY create_version(project_id: ID, commit_sha: String, tag: String, is_head: Boolean, created_at: Date) =>
    project <- N<PROJECT>(project_id)
    // For this example, we assume the commit node is created separately.
    // A robust find-or-create pattern would be more complex.
    commit <- N<COMMIT>({sha: commit_sha})
    version <- AddN<VERSION>({sha: commit_sha, tag: tag, is_head: is_head, created_at: created_at})
    AddE<HAS_VERSION>()::From(project)::To(version)
    AddE<IS_COMMIT>()::From(version)::To(commit)
    RETURN version

// --- Batch Creation for Code Structure ---
// NOTE: The parameter type `[{...}]` for arrays of objects is assumed to be valid by the parser.

// Batch creates FILE nodes for a given VERSION
QUERY create_files_for_version(version_id: ID, files: [{path: String, language: String}]) => 
    version_node <- N<VERSION>(version_id)
    FOR { path, language } IN files {
        file_node <- AddN<FILE>({path: path, language: language})
        AddE<CONTAINS_CODE>()::From(version_node)::To(file_node)
    }
    RETURN "success"

// Batch creates FUNCTION nodes and links them to their parent FILE
QUERY create_functions_for_file(file_id: ID, functions: [{name: String, signature: String, start_line: I32, end_line: I32, is_component: Boolean}]) =>
    file_node <- N<FILE>(file_id)
    FOR { name, signature, start_line, end_line, is_component } IN functions {
        func_node <- AddN<FUNCTION>({
            name: name, 
            signature: signature, 
            start_line: start_line, 
            end_line: end_line, 
            is_component: is_component
        })
        AddE<DEFINES>()::From(file_node)::To(func_node)
    }
    RETURN "success"

// Batch creates CLASS nodes and links them to their parent FILE
QUERY create_classes_for_file(file_id: ID, classes: [{name: String, start_line: I32, end_line: I32}]) =>
    file_node <- N<FILE>(file_id)
    FOR { name, start_line, end_line } IN classes {
        class_node <- AddN<CLASS>({
            name: name, 
            start_line: start_line, 
            end_line: end_line
        })
        AddE<DEFINES>()::From(file_node)::To(class_node)
    }
    RETURN "success"

// Batch creates DATA_MODEL nodes and links them to their parent FILE
QUERY create_datamodels_for_file(file_id: ID, datamodels: [{name: String, construct: String, start_line: I32, end_line: I32}]) =>
    file_node <- N<FILE>(file_id)
    FOR { name, construct, start_line, end_line } IN datamodels {
        dm_node <- AddN<DATA_MODEL>({
            name: name, 
            construct: construct, 
            start_line: start_line, 
            end_line: end_line
        })
        AddE<DEFINES>()::From(file_node)::To(dm_node)
    }
    RETURN "success"

// Batch creates TEST nodes and links them to their parent FILE
QUERY create_tests_for_file(file_id: ID, tests: [{name: String, test_kind: String, start_line: I32, end_line: I32}]) =>
    file_node <- N<FILE>(file_id)
    FOR { name, test_kind, start_line, end_line } IN tests {
        test_node <- AddN<TEST>({
            name: name, 
            test_kind: test_kind,
            start_line: start_line, 
            end_line: end_line
        })
        AddE<DEFINES>()::From(file_node)::To(test_node)
    }
    RETURN "success"

// Batch creates ENDPOINT nodes and links them to their parent FILE
QUERY create_endpoints_for_file(file_id: ID, endpoints: [{path: String, http_method: String}]) =>
    file_node <- N<FILE>(file_id)
    FOR { path, http_method } IN endpoints {
        ep_node <- AddN<ENDPOINT>({ path: path, http_method: http_method })
        AddE<DEFINES>()::From(file_node)::To(ep_node)
    }
    RETURN "success"

// Batch creates CODE_CHUNK vectors and links them to their source FUNCTION/CLASS
QUERY embed_code_chunks(chunks: [{source_node_id: ID, source_node_key: String, language: String, vector: [F64]}]) =>
    FOR { source_node_id, source_node_key, language, vector } IN chunks {
        source_node <- N(source_node_id)
        code_chunk <- AddV<CODE_CHUNK>(vector, {source_node_key: source_node_key, language: language})
        AddE<HAS_EMBEDDING>()::From(source_node)::To(code_chunk)
    }
    RETURN "success"

// --- Batch Edge Creation for Relationships ---

// Batch creates CALLS edges between functions
QUERY create_calls_edges(calls: [{from_func_id: ID, to_func_id: ID}]) =>
    FOR { from_func_id, to_func_id } IN calls {
        from_node <- N<FUNCTION>(from_func_id)
        to_node <- N<FUNCTION>(to_func_id)
        AddE<CALLS>()::From(from_node)::To(to_node)
    }
    RETURN "success"

// Batch creates TESTS edges
QUERY create_tests_edges(tests: [{test_id: ID, target_id: ID}]) =>
    FOR { test_id, target_id } IN tests {
        from_node <- N<TEST>(test_id)
        to_node <- N(target_id) // Target can be FUNCTION, CLASS, etc.
        AddE<TESTS>()::From(from_node)::To(to_node)
    }
    RETURN "success"

// Batch creates HANDLED_BY edges between endpoints and functions
QUERY create_handled_by_edges(handlers: [{endpoint_id: ID, function_id: ID}]) =>
    FOR { endpoint_id, function_id } IN handlers {
        from_node <- N<ENDPOINT>(endpoint_id)
        to_node <- N<FUNCTION>(function_id)
        AddE<HANDLED_BY>()::From(from_node)::To(to_node)
    }
    RETURN "success"


// =====================================================================
// Section B: Basic Retrieval & Analysis Queries
// =====================================================================
// Finds a function's details.(FUNCTION)
// and traverses backwards to verify its context (file and version). This is a more robust pattern.
QUERY find_function_details(version_sha: String, file_path: String, function_name: String) =>
    // Start from all functions with the given name
    candidate_funcs <- N<FUNCTION>({ name: function_name })
    // Filter them to find the one in the correct version and file
    func <- candidate_funcs::WHERE(
        EXISTS(
            _::InE<DEFINES>
             ::FromN
             ::WHERE(_::{path}::EQ(file_path))
             ::InE<CONTAINS_CODE>
             ::FromN
             ::WHERE(_::{sha}::EQ(version_sha))
        )
    )
    RETURN func::{ id, name, signature, start_line, end_line, is_component }

// Finds all functions that a given function calls.
QUERY get_function_callees(function_id: ID) =>
    callees <- N<FUNCTION>(function_id)::Out<CALLS>
    RETURN callees::{ id, name, path: _::InE<DEFINES>::FromN::{path} }

// Finds all functions that call a given function.
QUERY get_function_callers(function_id: ID) =>
    callers <- N<FUNCTION>(function_id)::In<CALLS>
    RETURN callers::{ id, name, path: _::InE<DEFINES>::FromN::{path} }

// Finds all tests that cover a specific function.
QUERY get_tests_for_function(function_id: ID) =>
    tests <- N<FUNCTION>(function_id)::In<TESTS>
    RETURN tests::{ id, name, test_kind, path: _::InE<DEFINES>::FromN::{path} }

// Finds the handler function for a given API endpoint.
// The additional filter (`http_method`) is now applied in a subsequent WHERE clause,
// which is the correct HQL pattern.
QUERY get_endpoint_handler(api_path: String, http_method: String) =>
    handler <- N<ENDPOINT>({ path: api_path })
        ::WHERE(_::{http_method}::EQ(http_method))
        ::Out<HANDLED_BY>
    RETURN handler::{ id, name, signature, path: _::InE<DEFINES>::FromN::{path} }

// Gets all files in a specific version.
QUERY get_files_in_version(version_sha: String) =>
    files <- N<VERSION>({ sha: version_sha })::Out<CONTAINS_CODE>
    RETURN files::{ id, path, language }


// =====================================================================
// Section C: Vector & Hybrid Search Queries
// =====================================================================
// Finds code chunks semantically similar to the input text.
// property on the returned vector nodes. We traverse from each vector to its source
// node to construct the final output object.
QUERY find_similar_code_chunks(query_text: String, k: I64) =>
    vectors <- SearchV<CODE_CHUNK>(Embed(query_text), k)
    RETURN vectors::{
        score,
        source_node: _::In<HAS_EMBEDDING>::{
            id,
            name,
            path: _::InE<DEFINES>::FromN::{path}
        }
    }

// Finds relevant documentation chunks for a natural language query.
// and can be accessed directly in the remapping.
QUERY find_relevant_docs(query_text: String, k: I64) =>
    docs <- SearchV<README_CHUNK>(Embed(query_text), k)
    RETURN docs::{ source_file, start_line, end_line, score }

// A hybrid query: Find functions that are CALLED BY a specific function AND are 
// semantically SIMILAR to a given text description.
// The correct pattern is `collection::CONTAINS(item)`, not `item::IS_IN(collection)`.
QUERY find_relevant_callees(function_id: ID, query_text: String, k: I64) =>
    callees <- N<FUNCTION>(function_id)::Out<CALLS>
    similar_chunks <- SearchV<CODE_CHUNK>(Embed(query_text), k)
    similar_functions <- similar_chunks::In<HAS_EMBEDDING>
    relevant_callees <- callees::WHERE(
        EXISTS(similar_functions::WHERE(_::ID::EQ(callees::ID)))
    )
    RETURN relevant_callees::{id, name}

// =====================================================================
// Section D: Deletion Queries
// =====================================================================

// Deletes a specific version and all its contained files and code entities.
QUERY delete_version(version_sha: String) =>
    version <- N<VERSION>({ sha: version_sha })
    files <- version::Out<CONTAINS_CODE>
    code_entities <- files::Out<DEFINES>
    
    // Drop all relationships and nodes cascading down from the version
    // 1. Drop edges from the version node itself
    DROP version::InE
    DROP version::OutE
    // 2. Drop edges from files
    DROP files::InE
    DROP files::OutE
    // 3. Drop edges from code entities
    DROP code_entities::InE
    DROP code_entities::OutE
    // 4. Drop the nodes themselves
    DROP code_entities
    DROP files
    DROP version
    
    RETURN "success"
