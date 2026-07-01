import { createBrowserRouter } from "react-router";
import { SplashScreen } from "./screens/SplashScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { CropSelectionScreen } from "./screens/CropSelectionScreen";
import { PredictionScreen } from "./screens/PredictionScreen";
import { MandiCompareScreen } from "./screens/MandiCompareScreen";
import { MandiInfoScreen } from "./screens/MandiInfoScreen";
import { AlertsScreen } from "./screens/AlertsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SplashScreen,
  },
  {
    path: "/login",
    Component: LoginScreen,
  },
  {
    path: "/home",
    Component: HomeScreen,
  },
  {
    path: "/crops",
    Component: CropSelectionScreen,
  },
  {
    path: "/prediction",
    Component: PredictionScreen,
  },
  {
    path: "/compare",
    Component: MandiCompareScreen,
  },
  {
    path: "/mandi-info",
    Component: MandiInfoScreen,
  },
  {
    path: "/alerts",
    Component: AlertsScreen,
  },
  {
    path: "/profile",
    Component: ProfileScreen,
  },
]);
