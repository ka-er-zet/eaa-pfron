$python = "C:/Users/marci/OneDrive/Documents/EAA/.venv/Scripts/python.exe"
$script = "$PSScriptRoot\convert_pdf_annexC_to_json.py"
$validate = "$PSScriptRoot\validate_clauses_json.py"

Write-Host "Running PDF parser to regenerate clause JSON files..."
& $python $script
if ($LASTEXITCODE -ne 0) {
    Write-Error "PDF parser failed (exit code $LASTEXITCODE)"
    exit $LASTEXITCODE
}

Write-Host "Validating generated clause JSON files..."
& $python $validate
if ($LASTEXITCODE -ne 0) {
    Write-Error "Validation failed (exit code $LASTEXITCODE)"
    exit $LASTEXITCODE
}

Write-Host "PDF regeneration and validation completed successfully."
