#!/bin/bash
# filepath: /home/jason/git/notes/work/news/run.sh

# run.sh - Execute prompts from config.json with variable substitution
# Usage: ./run.sh [prompt_name]
#   prompt_name: Name of prompt to run (optional, runs all if omitted)
# Examples:
#   ./run.sh                    # Run all prompts
#   ./run.sh scatter            # Run scatter prompt only

set -e

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.json"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed. Please install jq."
    exit 1
fi

# Check if config file exists
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "Error: config.json not found at $CONFIG_FILE"
    exit 1
fi

# Check if prompt name is provided
PROMPT_NAME="${1:-}"

# Get the command prefix from config (needed early for execute_prompt function)
COMMAND_PREFIX=$(jq -r '.command' "$CONFIG_FILE")

# Function to move old report files to reports directory
move_old_reports() {
    echo "Checking for news report files to organize..."
    
    # Find all *_news_report.md files in the root directory
    local report_files=()
    while IFS= read -r file; do
        [[ -n "$file" ]] && report_files+=("$file")
    done < <(find "$SCRIPT_DIR" -maxdepth 1 -name "*_news_report.md" -type f)
    
    # If no report files found, nothing to do
    if [[ ${#report_files[@]} -eq 0 ]]; then
        echo "No news report files found in root directory."
        return 0
    fi
    
    # If only one file, keep it in root
    if [[ ${#report_files[@]} -eq 1 ]]; then
        echo "Only one report file found, keeping it in root: ${report_files[0]##*/}"
        return 0
    fi
    
    # Sort files by name (date is in filename) and get the latest
    local latest_file=$(printf '%s\n' "${report_files[@]}" | sort -r | head -n 1)
    
    echo "Latest report: ${latest_file##*/}"
    echo "Moving older reports to reports directory..."
    
    # Create reports directory if it doesn't exist
    mkdir -p "$SCRIPT_DIR/reports"
    
    # Move all except the latest to reports directory
    local moved_count=0
    for file in "${report_files[@]}"; do
        if [[ "$file" != "$latest_file" ]]; then
            local filename="${file##*/}"
            echo "  Moving: $filename"
            mv "$file" "$SCRIPT_DIR/reports/"
            ((moved_count++))
        fi
    done
    
    echo "✓ Moved $moved_count report file(s) to reports directory"
}

# Function to substitute variables in a string
substitute_vars() {
    local text="$1"
    local context="$2"
    
    # First, get the value from config which may contain command substitutions
    # Replace {{variable}} patterns with values from config
    # This handles simple paths like {{work}}, {{report}}, {{template}}
    while [[ "$text" =~ \{\{([a-zA-Z0-9_.]+)\}\} ]]; do
        local var_path="${BASH_REMATCH[1]}"
        local value
        
        # Handle special case where context is provided (for iteration variables)
        if [[ -n "$context" ]] && [[ "$var_path" == "source" ]]; then
            value="$context"
        else
            # Get the value from config - try as raw string first
            value=$(jq -r ".$var_path // empty" "$CONFIG_FILE" 2>/dev/null)
            
            # If it's an array or object, convert to compact JSON string
            if [[ -z "$value" || "$value" == "null" ]]; then
                value=$(jq -c ".$var_path // empty" "$CONFIG_FILE" 2>/dev/null)
            fi
            
            # Convert relative paths to absolute paths based on script directory
            # Check if value looks like a relative path (doesn't start with /, http, or $)
            if [[ -n "$value" && "$value" != "null" && "$value" != /* && "$value" != http* && "$value" != \$* ]]; then
                # Check if it contains command substitution - evaluate it first, then prepend path
                if [[ "$value" =~ \$\( ]]; then
                    # Evaluate the command substitution first
                    local evaluated_value
                    evaluated_value=$(eval echo "$value" 2>/dev/null || echo "$value")
                    value="$SCRIPT_DIR/$evaluated_value"
                else
                    # Simple path without command substitution
                    value="$SCRIPT_DIR/$value"
                fi
            fi
        fi
        
        # Escape the value for safe substitution in eval context
        # Replace backslashes and quotes to prevent issues
        value="${value//\\/\\\\}"
        value="${value//\"/\\\"}"
        
        # Replace the variable in text
        text="${text//\{\{$var_path\}\}/$value}"
    done
    
    # Now process any command substitutions $(...)
    # Use eval to execute command substitutions safely
    eval "text=\"$text\"" 2>/dev/null || true
    
    echo "$text"
}

# Function to execute a single prompt
execute_prompt() {
    local prompt_text="$1"
    local iteration_value="$2"
    
    # Substitute variables in the prompt
    if [[ -n "$iteration_value" ]]; then
        # For iteration, substitute the iteration variable first
        prompt_text="${prompt_text//\{\{source\}\}/$iteration_value}"
    fi
    
    # Substitute all other variables
    prompt_text=$(substitute_vars "$prompt_text" "$iteration_value")
    
    echo "----------------------------------------"
    echo "Executing prompt:"
    echo "$prompt_text"
    echo "----------------------------------------"
    
    # Write prompt to a temporary file to avoid shell escaping issues
    local temp_prompt=$(mktemp)
    echo "$prompt_text" > "$temp_prompt"
    
    # Change to the script directory before executing command, then return
    pushd "$SCRIPT_DIR" > /dev/null
    
    # Execute the command with the prompt from file
    # Capture exit code but don't exit immediately on failure
    # Redirect stdin from /dev/null to prevent consuming loop input
    set +e
    ${COMMAND_PREFIX}"$(cat "$temp_prompt")" < /dev/null
    local exit_code=$?
    set -e
    
    popd > /dev/null
    
    # Clean up
    rm -f "$temp_prompt"
    
    # Return the exit code
    return $exit_code
}

if [[ -z "$PROMPT_NAME" ]]; then
    echo "No prompt specified. Executing all prompts sequentially..."
    echo ""
    
    # Get all prompt names in the order they appear in the file (not sorted)
    PROMPT_NAMES=$(jq -r '.prompts | keys_unsorted[]' "$CONFIG_FILE")
    
    # Execute each prompt
    while IFS= read -r prompt; do
        echo ""
        echo "========================================"
        echo "Starting prompt: $prompt"
        echo "========================================"
        "$0" "$prompt"
    done <<< "$PROMPT_NAMES"
    
    echo ""
    echo "✓ All prompts completed successfully!"
    
    # Move old reports after all prompts complete
    echo ""
    move_old_reports
    
    exit 0
fi

# Check if prompt exists
if ! jq -e ".prompts.\"$PROMPT_NAME\"" "$CONFIG_FILE" > /dev/null 2>&1; then
    echo "Error: Prompt '$PROMPT_NAME' not found in config.json"
    echo ""
    echo "Available prompts:"
    jq -r '.prompts | keys[]' "$CONFIG_FILE" | sed 's/^/  - /'
    exit 1
fi

# Get prompt configuration
PROMPT_CONFIG=$(jq -c ".prompts.\"$PROMPT_NAME\"" "$CONFIG_FILE")

# Check if this prompt has iteration
ITERATE_FIELD=$(echo "$PROMPT_CONFIG" | jq -r '.iterate // empty')
AS_FIELD=$(echo "$PROMPT_CONFIG" | jq -r '.as // empty')

# Get the template (array of lines)
TEMPLATE=$(echo "$PROMPT_CONFIG" | jq -r '.template // .prompt // empty')

if [[ -z "$TEMPLATE" || "$TEMPLATE" == "null" || "$TEMPLATE" == "[]" ]]; then
    echo "Error: No template found for prompt '$PROMPT_NAME'"
    exit 1
fi

# Convert template array to single string with newlines
PROMPT_TEXT=$(echo "$TEMPLATE" | jq -r 'if type == "array" then join("\n") else . end')

if [[ -z "$PROMPT_TEXT" ]]; then
    echo "Error: Empty prompt text for '$PROMPT_NAME'"
    exit 1
fi

# Execute the prompt
if [[ -n "$ITERATE_FIELD" ]]; then
    echo "Iterating over '$ITERATE_FIELD' as '$AS_FIELD'"
    
    # Get the array to iterate over
    ITEMS=$(jq -r ".$ITERATE_FIELD[]" "$CONFIG_FILE")
    
    # Track successes and failures
    SUCCESS_COUNT=0
    FAILURE_COUNT=0
    git init
    # Execute prompt for each item
    while IFS= read -r item; do
        echo ""
        echo "========================================"
        echo "Processing: $item"
        echo "========================================"
        if execute_prompt "$PROMPT_TEXT" "$item"; then
            ((SUCCESS_COUNT++)) || true
            echo "✓ Successfully processed: $item"
        else
            ((FAILURE_COUNT++)) || true
            echo "✗ Failed to process: $item"
        fi
    done <<< "$ITEMS"
    
    echo ""
    echo "Summary: $SUCCESS_COUNT succeeded, $FAILURE_COUNT failed"
else
    # Execute once without iteration
    execute_prompt "$PROMPT_TEXT" ""
fi

echo ""
echo "✓ Completed execution of prompt: $PROMPT_NAME"

# Move old reports after individual prompt completes
echo ""
move_old_reports