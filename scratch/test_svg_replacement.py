import win32com.client
import os

word = win32com.client.Dispatch("Word.Application")
word.Visible = False

try:
    doc_path = os.path.abspath(r"scratch\test_placeholder.docx")
    svg_path = os.path.abspath(r"review3_results_evidence\figure_2a_detection_performance.svg")
    print(f"Opening: {doc_path}")
    print(f"SVG: {svg_path}")
    doc = word.Documents.Open(doc_path)
    
    # Try find and replace
    find = doc.Content.Find
    find.Execute(FindText="{{FIGURE_2A}}")
    if find.Found:
        print("Found {{FIGURE_2A}}!")
        rng = find.Parent
        rng.Text = ""
        shape = rng.InlineShapes.AddPicture(FileName=svg_path, LinkToFile=False, SaveWithDocument=True)
        shape.Width = 420
        shape.Range.ParagraphFormat.Alignment = 1
        print("Successfully replaced with SVG shape!")
    else:
        print("NOT found!")
        
    out_pdf = os.path.abspath(r"scratch\test_replaced.pdf")
    doc.SaveAs(out_pdf, FileFormat=17)
    doc.Close(SaveChanges=False)
    print("Exported PDF successfully!")
finally:
    word.Quit()
