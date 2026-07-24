import { useParams } from "react-router-dom";
import ClinicLegacyRedirect from "./ClinicLegacyRedirect";
import ClinicCityLanding from "./ClinicCityLanding";

const isUUID = (val: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(val);

// /clinic/:token is ambiguous on its own: it's either an old numeric clinic
// id (legacy link, needs a redirect to the new canonical slug URL) or a city
// slug (pretty direct link into the listing page). Decide once, here.
export default function ClinicTokenRoute() {
  const { token } = useParams();
  if (!token) return null;
  return isUUID(token) ? <ClinicLegacyRedirect id={token} /> : <ClinicCityLanding citySlug={token} />;
}
