$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $docPath = "c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\Review3_ACAFDM_Vehicular_Flooding_Results_Completed.docx"
    $doc = $word.Documents.Open($docPath)
    $pages = $doc.ComputeStatistics(2) # wdStatisticPages = 2
    $words = $doc.ComputeStatistics(0) # wdStatisticWords = 0
    Write-Host "SUCCESS: Microsoft Word opened the document without error!"
    Write-Host "Page count: $pages"
    Write-Host "Word count: $words"
    $doc.Close(0) # wdDoNotSaveChanges = 0
} catch {
    Write-Host "ERROR: $_"
} finally {
    $word.Quit()
}
