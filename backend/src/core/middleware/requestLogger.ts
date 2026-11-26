import { logger } from "../../config/logger";
import { createRequestLogger } from "./requestLoggerCore";

export const requestLogger = createRequestLogger(logger);
