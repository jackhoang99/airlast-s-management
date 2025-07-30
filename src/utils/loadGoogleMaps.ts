import { Loader } from "@googlemaps/js-api-loader";

const loader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  version: "weekly",
  libraries: ["places"], // ❌ don't use "routes"
});

export default loader;
