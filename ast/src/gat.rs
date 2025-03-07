use anyhow::Result;
use git2::{DiffOptions, Repository};

pub fn get_changed_files(repo_path: &str, old_rev: &str, new_rev: &str) -> Result<Vec<String>> {
    // Open the repository
    let repo = Repository::open(repo_path)?;

    // Look up the two commits
    let old_commit = repo.revparse_single(old_rev)?.peel_to_commit()?;
    let new_commit = repo.revparse_single(new_rev)?.peel_to_commit()?;

    // Get the trees for both commits
    let old_tree = old_commit.tree()?;
    let new_tree = new_commit.tree()?;

    // Create diff options
    let mut diff_opts = DiffOptions::new();

    // Get the diff between the two trees
    let diff = repo.diff_tree_to_tree(Some(&old_tree), Some(&new_tree), Some(&mut diff_opts))?;

    // Collect changed files
    let mut changed_files = Vec::new();

    // Iterate through diff deltas
    diff.foreach(
        &mut |delta, _| {
            if let Some(new_file) = delta.new_file().path() {
                if let Some(path_str) = new_file.to_str() {
                    changed_files.push(path_str.to_string());
                }
            }
            true
        },
        None,
        None,
        None,
    )?;

    Ok(changed_files)
}
