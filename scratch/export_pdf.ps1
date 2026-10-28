$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open('c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\Review3_ACAFDM_Vehicular_Flooding_Results_Completed.docx')
    $pdfPath = 'c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X\Review3_ACAFDM_Vehicular_Flooding_Results_Completed.pdf'
    $doc.ExportAsFixedFormat($pdfPath, 17) # 17 = wdExportFormatPDF
    Write-Host "PDF successfully exported to: $pdfPath"
    $doc.Close(0)
} catch {
    Write-Host "PDF Export error: $_"
} finally {
    $word.Quit()
}
