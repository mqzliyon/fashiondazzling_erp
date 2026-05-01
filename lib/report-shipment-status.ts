/** Labels shown on shipment reports (raw API values unchanged in DB). */
export function foreignShipmentReportStatus(status: string | undefined): string {
  if (!status) return "-";
  return status === "Packed" ? "Delivered" : status;
}

export function officeShipmentReportStatus(status: string | undefined): string {
  if (!status) return "-";
  return status.toLowerCase() === "dispatched" ? "Delivered" : status;
}
