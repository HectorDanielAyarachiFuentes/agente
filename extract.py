import os
from PyPDF2 import PdfReader

knowledge_dir = "Asistente_Inscripciones/conocimiento"
output_file = "Asistente_Inscripciones/conocimiento.txt"

texts = []

for filename in os.listdir(knowledge_dir):
    filepath = os.path.join(knowledge_dir, filename)
    if filename.endswith(".pdf"):
        reader = PdfReader(filepath)
        text = f"--- Documento: {filename} ---\n"
        for page in reader.pages:
            if page.extract_text():
                text += page.extract_text() + "\n"
        texts.append(text)
    elif filename.endswith(".txt") or filename.endswith(".csv"):
        with open(filepath, 'r', encoding='utf-8') as f:
            text = f"--- Documento: {filename} ---\n" + f.read() + "\n"
        texts.append(text)

with open(output_file, 'w', encoding='utf-8') as f:
    f.write("\n\n".join(texts))
print("Extraction complete")
