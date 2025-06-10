import { NavigateFunction } from "react-router-dom";

export const handleNavigate = (navigate: NavigateFunction, path: string) => {
  navigate(`/${path}`);
};
