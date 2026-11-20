function field(id: string, value: string) {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function pixPayload(input: { key: string; name: string; city: string; amount: string }) {
  const merchant = field("00", "br.gov.bcb.pix") + field("01", input.key);
  const amount = Number(input.amount).toFixed(2);
  const body =
    field("00", "01") +
    field("26", merchant) +
    field("52", "0000") +
    field("53", "986") +
    field("54", amount) +
    field("58", "BR") +
    field("59", input.name.slice(0, 25)) +
    field("60", input.city.slice(0, 15)) +
    field("62", field("05", "YAMACOACH")) +
    "6304";
  return body + crc16(body);
}

export function pixConfig() {
  return {
    key: process.env.PIX_KEY || "yamacoach@pix.com.br",
    name: process.env.PIX_MERCHANT_NAME || "YAMA COACH",
    city: process.env.PIX_MERCHANT_CITY || "SAO PAULO",
    amount: process.env.PIX_AMOUNT || "197.00",
  };
}
