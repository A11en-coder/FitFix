import QRCode from "qrcode";

export function equipmentPageUrl(appUrl: string, publicId: string): string {
  return new URL(`/equipment/${encodeURIComponent(publicId)}`, appUrl).toString();
}

// this function generates a QR code PNG for the given URL and returns it as a Buffer
export async function createEquipmentQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
  });
}
