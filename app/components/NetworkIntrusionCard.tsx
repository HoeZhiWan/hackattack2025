import React from "react";

interface NetworkIntrusionCardProps {
    title: string;
    value: string | number;
    info?: string;
    icon?: React.ReactNode;
    infoColor: string;
}

const NetworkIntrusionCard: React.FC<NetworkIntrusionCardProps> = ({
    title,
    value,
    info,
    icon,
    infoColor,
}) => (
    <div
        style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
            padding: 16,
            flex: "1 1 200px",
            minWidth: 200,
            position: "relative",
        }}
    >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 6 }}>{value}</div>
        <div style={{ fontSize: 12, color: infoColor }}>{info}</div>
        {icon && (
            <div style={{ position: "absolute", right: 15, top: 15, fontWeight: "bold", color: infoColor }}>
                {icon}
            </div>
        )}
    </div>
);

export default NetworkIntrusionCard;
