export default async function loadExcelAsJSON(filepath, sheetName) {
    const response = await fetch(filepath);
    if (!response.ok) {
        throw new Error(`Failed to fetch file at ${filepath}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const sheet = sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheet];

    if (!worksheet) {
        throw new Error(`Sheet "${sheet}" not found in file ${filepath}`);
    }

    return XLSX.utils.sheet_to_json(worksheet);
}