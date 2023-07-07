function getDefaultParams(param: string, val: string): string;
function getDefaultParams(param: string, val: number): number;
function getDefaultParams(param: string, val: boolean): boolean;
function getDefaultParams(param: any, val: any) {
  const queryParameters = new URLSearchParams(window.location.search);
  const get = queryParameters.get(param);
  if (typeof val === "string") {
    return get ?? val;
  } else if (typeof val === "number") {
    return parseFloat(get ?? `${val}`);
  } else if (typeof val === "boolean") {
    if (get === "stream") return true;
    if (get === "fetch") return false;
    if (get === "true") return true;
    if (get === "false") return false;
    return val;
  }
}

export default getDefaultParams;
