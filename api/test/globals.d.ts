// Fork: the tests read JSON answers loosely, as they did in JavaScript. Node's types make
// Response.json() unknown; this adds the `any` overload for the test files. The routes' own
// answers are typed by the OpenAPI schemas (openapi/), not here.
export {};
declare global {
  interface Response { json(): Promise<any> }
  interface Body { json(): Promise<any> }
}
