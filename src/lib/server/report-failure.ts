import "astro:env/server";
import { createFailureReporter } from "../observability";

export const reportFailure = createFailureReporter((json) => {
  console.error(json);
});
