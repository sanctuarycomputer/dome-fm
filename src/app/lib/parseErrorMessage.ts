export default function parseErrorMessage(e: any) {
  let message = "unknown";
  if (typeof e === "string") {
    message = e;
  } else if (e instanceof Error) {
    message = e.message;
  }
  return message;
}