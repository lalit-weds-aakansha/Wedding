import { wedding } from "../config/wedding";
export const siteUrl = () =>
  (import.meta.env.VITE_SITE_URL as string | undefined) || wedding.share.siteUrl || window.location.origin + window.location.pathname;
