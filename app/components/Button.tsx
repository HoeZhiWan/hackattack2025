import React from "react";

interface ButtonProps {
    children: React.ReactNode;
    color: string;
    onClick?: () => void;
    style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({ children, color, onClick, style }) => (
    <button
        onClick={onClick}
        style={{
            backgroundColor: color,
            color: "white",
            padding: "8px 14px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 13,
            ...style,
        }}
    >
        {children}
    </button>
);

export default Button;
