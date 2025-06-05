import React from "react";

interface RecentActivityItemProps {
    time: string;
    ip: string;
    description: string;
}

const RecentActivityItem: React.FC<RecentActivityItemProps> = ({ time, ip, description }) => (
    <div
        style={{
            borderBottom: "1px solid #ddd",
            padding: "10px 0",
            fontSize: 13,
            //backgroundColor: "#f9f9f9",
            color: "#000",
        }}
    >
        <div style={{ fontWeight: "bold" }}>{description}</div>
        <div style={{ color: "#666", fontSize: 12 }}>{time} ago • {ip}</div>
    </div>
);

export default RecentActivityItem;
