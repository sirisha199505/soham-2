import { createContext, useContext } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const colors = {
    // Core Tech Brand (using logo colors)
    primary: "#3BC0EF",    // Logo turquoise
    secondary: "#FAAB34",  // Logo orange
    accent: "#1E3A8A",     // Deep blue

    // Backgrounds
    background: "#FFFFFF", // Clean white
    surface: "#F8FAFC",    // Light tech gray
    card: "#FFFFFF",       // Card background

    // Text
    textPrimary: "#0F172A",   // Dark tech
    textSecondary: "#64748B", // Medium gray
    textInverse: "#FFFFFF",   // White text
    girlsColor: "#EC4899",    // Pink
    boysColor: "#3BC0EF",     // Turquoise

    // Arduino/Robotics Colors (using logo colors)
    arduino: "#3BC0EF",  // Logo turquoise
    sensor: "#FAAB34",   // Logo orange
    circuit: "#3BC0EF",  // Logo turquoise
    motor: "#FAAB34",    // Logo orange

    // Functional
    success: "#10B981",  // Green
    error: "#EF4444",    // Red pins/alerts
  };

  const currentTheme = colors;

  return (
    <ThemeContext.Provider value={{ currentTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
