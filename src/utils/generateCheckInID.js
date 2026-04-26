import crypto from "crypto";

export function generateCheckInID() {
  return "CHK-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex");
}
