import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Petopia REST API",
      version: "1.0.0",
      description:
        "A REST API for managing petopia app, including posts, comments and user authentication.",
      contact: {
        name: "Petopia Team",
        email: "petopia@gmail.com",
      },
    },
    servers: [
      {
        url: process.env.BASE_URL || "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT authorization header using the Bearer scheme",
        },
      },
      schemas: {
        User: {
          type: "object",
          required: ["email", "username", "password"],
          properties: {
            _id: {
              type: "string",
              description: "User unique identifier",
              example: "507f1f77bcf86cd799439011",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
              example: "user@example.com",
            },
            username: {
              type: "string",
              description: "User username",
              example: "petlover123",
            },
            password: {
              type: "string",
              minLength: 6,
              description: "User password (hashed when stored)",
              example: "password123",
            },
            dateOfBirth: {
              type: "string",
              format: "date-time",
              description: "User date of birth",
            },
            petsCount: {
              type: "number",
              description: "Number of pets owned",
              default: 0,
              example: 2,
            },
          },
        },
        Post: {
          type: "object",
          required: ["title", "content", "type", "authorId"],
          properties: {
            _id: {
              type: "string",
              description: "Post unique identifier",
              example: "507f1f77bcf86cd799439011",
            },
            title: {
              type: "string",
              description: "Post title",
              example: "My cute dog",
            },
            content: {
              type: "string",
              description: "Post content",
              example: "Check out this picture of my dog!",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            type: {
              type: "string",
              enum: ["Report", "Knowledge", "Donation", "Other"],
              description: "Type of the post",
              example: "Other",
            },
            authorId: {
              type: "string",
              description: "ID of the user who created this post",
              example: "507f1f77bcf86cd799439011",
            },
          },
        },
        Comment: {
          type: "object",
          required: ["content", "postId", "authorId"],
          properties: {
            _id: {
              type: "string",
              description: "Comment unique identifier",
              example: "507f1f77bcf86cd799439011",
            },
            content: {
              type: "string",
              description: "Comment content",
              example: "Adorable!",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            postId: {
              type: "string",
              description: "ID of the post this comment belongs to",
              example: "507f1f77bcf86cd799439011",
            },
            authorId: {
              type: "string",
              description: "ID of the user who wrote this comment",
              example: "507f1f77bcf86cd799439011",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            password: {
              type: "string",
              example: "password123",
            },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["email", "password", "username"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            password: {
              type: "string",
              minLength: 6,
              example: "password123",
            },
            username: {
              type: "string",
              example: "petlover123",
            },
            dateOfBirth: {
              type: "string",
              format: "date-time",
            },
            petsCount: {
              type: "number",
              example: 1,
            },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            accessToken: {
              type: "string",
              description: "JWT access token",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            refreshToken: {
              type: "string",
              description: "JWT refresh token",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        },
        RefreshTokenRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: {
              type: "string",
              description: "Valid refresh token",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
              example: "An error occurred",
            },
          },
        },
        ValidationError: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Validation error message",
              example: "Validation failed: Email is required",
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Access token is missing or invalid",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                error: "missing or invalid token",
              },
            },
          },
        },
        NotFoundError: {
          description: "The specified resource was not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                error: "Data not found",
              },
            },
          },
        },
        ValidationError: {
          description: "Validation error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ValidationError",
              },
              example: {
                error: "Validation failed: ...",
              },
            },
          },
        },
        ConflictError: {
          description: "Conflict error (e.g. duplicate key)",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: {
                    type: "string",
                    example: "Unique constraint error",
                  },
                  keys: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    example: ["email"],
                  },
                },
              },
            },
          },
        },
        ServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                error: "Something went wrong, please try again later",
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
