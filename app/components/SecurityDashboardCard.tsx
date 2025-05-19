import React from "react";

interface SecurityDashboardCardProps {
    title: string;
    value: string | number;
    info: string;
    bgColor: string;
    iconBgColor: string;
    icon: React.ReactNode;
    infoColor: string;
    infoIcon?: React.ReactNode;
}

const cardStyles = {
    card: {
        borderRadius: 8,
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
        padding: 16,
        minWidth: 200,
        position: "relative" as "relative", 
    },
    iconCircle: {
        position: "absolute" as "absolute", 
        right: 15,
        top: 15,
        width: 25,
        height: 25,
        borderRadius: "50%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontWeight: "bold",
        fontSize: 16,
        color: "white",
    } as React.CSSProperties, 
};
  

const SecurityDashboardCard: React.FC<SecurityDashboardCardProps> = ({
    title,
    value,
    info,
    bgColor,
    iconBgColor,
    icon,
    infoColor,
    infoIcon,
}) => (
    <div style={{ ...cardStyles.card, backgroundColor: bgColor }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 24, fontWeight: "bold", marginBottom: 6 }}>{value}</div>
        <div style={{ fontSize: 12, color: infoColor }}>{info}</div>
        <div style={{ ...cardStyles.iconCircle, backgroundColor: iconBgColor }}>{icon}</div>
        {infoIcon && (
            <div
                style={{
                    position: "absolute",
                    right: 15,
                    bottom: 15,
                    fontSize: 18,
                    cursor: "pointer",
                    color: "black",
                }}
                title="Details"
            >
                {infoIcon}
            </div>
        )}
    </div>
);

export default SecurityDashboardCard;
