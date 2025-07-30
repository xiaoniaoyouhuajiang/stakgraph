# StakTrak Tests

This directory contains tests for the StakTrak application.

## Test File Storage

By default, test files are stored in the `tests/generated_tests` directory. This directory is ignored by git, so your local test files won't be committed.

## Environment Variables

When running the application, you can configure where test files are stored using the following environment variable:

- `TESTS_DIR`: Sets the directory where test files are stored

## Usage

### Windows

```batch
# Set the tests directory (temporary for current session)
set TESTS_DIR=D:\path\to\tests\generated_tests

# Or use the provided script (sets to the /tests/generated_tests directory relative to the script)
call mcp\set-tests-dir.bat
```

### Linux/Mac

```bash
# Set the tests directory (temporary for current session)
export TESTS_DIR=/path/to/tests/generated_tests

# Or use the provided script (sets to the ./tests/generated_tests directory relative to the script)
source mcp/set-tests-dir.sh
```
