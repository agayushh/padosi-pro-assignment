export const errorMessages = {
  API: {
    INTERNAL_SERVER_ERROR: "Something went wrong. Please try again.",
    NOT_FOUND: "We could not find that.",
    VALIDATION: "Please check the highlighted fields.",
    INVALID_JSON: "Request body must be valid JSON.",
  },
  AUTH: {
    INVALID_CREDENTIALS: "Email or password is incorrect.",
    EMAIL_NOT_VERIFIED: "Verify your email before logging in.",
    USER_EXISTS: "An account with this email already exists. Please log in.",
    UNAUTHORIZED: "Log in to continue.",
    SESSION_EXPIRED: "Your session expired. Log in again.",
    SESSION_REUSE: "This session is no longer valid. Log in again.",
    EMAIL_FAILED: "We could not send the verification email. Please try again.",
    ALREADY_VERIFIED: "This email is already verified. Please log in.",
    UNKNOWN_EMAIL: "We could not find an account with that email.",
  },
} as const;
