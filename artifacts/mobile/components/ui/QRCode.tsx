import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export default function QRCode({
  value,
  size = 200,
  color = "#000000",
  backgroundColor = "#ffffff",
}: QRCodeProps) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return;
    QRCodeLib.toString(value, {
      type: "svg",
      width: size,
      margin: 1,
      color: { dark: color, light: backgroundColor },
    })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [value, size, color, backgroundColor]);

  if (!svg) {
    return <View style={{ width: size, height: size, backgroundColor }} />;
  }

  return (
    <SvgXml
      xml={svg}
      width={size}
      height={size}
    />
  );
}
