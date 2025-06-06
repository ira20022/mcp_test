#!/usr/bin/env node
import { MiroClient } from "./MiroClient.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListResourcesRequestSchema, ReadResourceRequestSchema, ListToolsRequestSchema, CallToolRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import fs from 'fs/promises';
import path from 'path';
// // Parse command line arguments
// const argv = await yargs(hideBin(process.argv))
//   .option("token", {
//     alias: "t",
//     type: "string",
//     description: "Miro OAuth token",
//   })
//   .help().argv;
const oauthToken = "eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_nnvACrX3PQ2eyddiwtXzN1ztys8";
if (!oauthToken) {
    console.error("Error: Miro OAuth token is required. Provide it via MIRO_OAUTH_TOKEN environment variable or --token argument");
    process.exit(1);
}
const server = new Server({
    name: "mcp-miro",
    version: "0.1.0",
}, {
    capabilities: {
        resources: {},
        tools: {},
        prompts: {},
    },
});
const miroClient = new MiroClient(oauthToken);
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const boards = await miroClient.getBoards();
    return {
        resources: boards.map((board) => ({
            uri: `miro://board/${board.id}`,
            mimeType: "application/json",
            name: board.name,
            description: board.description || `Miro board: ${board.name}`,
        })),
    };
});
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const url = new URL(request.params.uri);
    if (!request.params.uri.startsWith("miro://board/")) {
        throw new Error("Invalid Miro resource URI - must start with miro://board/");
    }
    const boardId = url.pathname.substring(1); // Remove leading slash from pathname
    const items = await miroClient.getBoardItems(boardId);
    return {
        contents: [
            {
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify(items, null, 2),
            },
        ],
    };
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_boards",
                description: "List all available Miro boards and their IDs",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "add_image",
                description: "If",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "create_sticky_note",
                description: "Create a sticky note on a Miro board. By default, sticky notes are 199x228 and available in these colors: gray, light_yellow, yellow, orange, light_green, green, dark_green, cyan, light_pink, pink, violet, red, light_blue, blue, dark_blue, black.",
                inputSchema: {
                    type: "object",
                    properties: {
                        boardId: {
                            type: "string",
                            description: "ID of the board to create the sticky note on",
                        },
                        content: {
                            type: "string",
                            description: "Text content of the sticky note",
                        },
                        color: {
                            type: "string",
                            description: "Color of the sticky note (e.g. 'yellow', 'blue', 'pink')",
                            enum: [
                                "gray",
                                "light_yellow",
                                "yellow",
                                "orange",
                                "light_green",
                                "green",
                                "dark_green",
                                "cyan",
                                "light_pink",
                                "pink",
                                "violet",
                                "red",
                                "light_blue",
                                "blue",
                                "dark_blue",
                                "black",
                            ],
                            default: "yellow",
                        },
                        x: {
                            type: "number",
                            description: "X coordinate position",
                            default: 0,
                        },
                        y: {
                            type: "number",
                            description: "Y coordinate position",
                            default: 0,
                        },
                    },
                    required: ["boardId", "content"],
                },
            },
            {
                name: "bulk_create_items",
                description: "Create multiple items on a Miro board in a single transaction (max 20 items)",
                inputSchema: {
                    type: "object",
                    properties: {
                        boardId: {
                            type: "string",
                            description: "ID of the board to create the items on",
                        },
                        items: {
                            type: "array",
                            description: "Array of items to create",
                            items: {
                                type: "object",
                                properties: {
                                    type: {
                                        type: "string",
                                        enum: [
                                            "app_card",
                                            "text",
                                            "shape",
                                            "sticky_note",
                                            "image",
                                            "document",
                                            "card",
                                            "frame",
                                            "embed",
                                        ],
                                        description: "Type of item to create",
                                    },
                                    data: {
                                        type: "object",
                                        description: "Item-specific data configuration",
                                    },
                                    style: {
                                        type: "object",
                                        description: "Item-specific style configuration",
                                    },
                                    position: {
                                        type: "object",
                                        description: "Item position configuration",
                                    },
                                    geometry: {
                                        type: "object",
                                        description: "Item geometry configuration",
                                    },
                                    parent: {
                                        type: "object",
                                        description: "Parent item configuration",
                                    },
                                },
                                required: ["type"],
                            },
                            minItems: 1,
                            maxItems: 20,
                        },
                    },
                    required: ["boardId", "items"],
                },
            },
            {
                name: "get_connectors",
                description: "Retrieve a paginated list of connectors from a specific Miro board using optional limit and cursor parameters.",
                inputSchema: {
                    type: "object",
                    properties: {
                        boardId: {
                            type: "string",
                            description: "Unique identifier (ID) of the board from which you want to retrieve a list of connectors.",
                        },
                        limit: {
                            type: "string",
                            description: "Maximum number of connectors to return (10 to 50).",
                            default: "10",
                        },
                        cursor: {
                            type: "string",
                            description: "Cursor value to retrieve the next set of results in a paginated response.",
                        },
                    },
                    required: ["boardId"],
                },
            },
            {
                name: "get_frames",
                description: "Get all frames from a Miro board",
                inputSchema: {
                    type: "object",
                    properties: {
                        boardId: {
                            type: "string",
                            description: "ID of the board to get frames from",
                        },
                    },
                    required: ["boardId"],
                },
            },
            {
                name: "get_items_in_frame",
                description: "Get all items contained within a specific frame on a Miro board",
                inputSchema: {
                    type: "object",
                    properties: {
                        boardId: {
                            type: "string",
                            description: "ID of the board that contains the frame",
                        },
                        frameId: {
                            type: "string",
                            description: "ID of the frame to get items from",
                        },
                    },
                    required: ["boardId", "frameId"],
                },
            },
            {
                name: "create_connector",
                description: "Add a arrow between two items on a Miro board. An arrow is a line linking shapes or other objects. Supports captions, different stroke styles, and connector decorations.",
                inputSchema: {
                    type: "object",
                    properties: {
                        boardId: {
                            type: "string",
                            description: "Unique identifier (ID) of the board for which you want to create the connector",
                        },
                        startItem: {
                            type: "object",
                            description: "Start point of the connector",
                            properties: {
                                id: {
                                    type: "string",
                                    description: "ID of the item to attach the start of the connector to",
                                },
                                position: {
                                    type: "object",
                                    description: "Relative position on the item (0%-100%)",
                                    properties: {
                                        x: { type: "string", description: "Horizontal position (0%-100%)" },
                                        y: { type: "string", description: "Vertical position (0%-100%)" },
                                    },
                                },
                                snapTo: {
                                    type: "string",
                                    description: "Side of the item to attach to",
                                    enum: ["top", "bottom", "left", "right", "auto"],
                                    default: "auto",
                                },
                            },
                            required: ["id"],
                        },
                        endItem: {
                            type: "object",
                            description: "End point of the connector",
                            properties: {
                                id: {
                                    type: "string",
                                    description: "ID of the item to attach the end of the connector to",
                                },
                                position: {
                                    type: "object",
                                    description: "Relative position on the item (0%-100%)",
                                    properties: {
                                        x: { type: "string", description: "Horizontal position (0%-100%)" },
                                        y: { type: "string", description: "Vertical position (0%-100%)" },
                                    },
                                },
                                snapTo: {
                                    type: "string",
                                    description: "Side of the item to attach to",
                                    enum: ["top", "bottom", "left", "right", "auto"],
                                    default: "auto",
                                },
                            },
                            required: ["id"],
                        },
                        shape: {
                            type: "string",
                            description: "Path type of the connector line, defines curvature",
                            enum: ["curved", "elbowed", "straight"],
                            default: "curved",
                        },
                        captions: {
                            type: "array",
                            maxItems: 20,
                            items: {
                                type: "object",
                                properties: {
                                    content: {
                                        type: "string",
                                        minLength: 1,
                                        maxLength: 200,
                                        description: "Text to display on the connector (supports inline HTML)",
                                    },
                                    position: {
                                        type: "string",
                                        description: "Relative position of the caption (0%-100%)",
                                        default: "50%",
                                    },
                                    textAlignVertical: {
                                        type: "string",
                                        description: "Vertical alignment of the caption",
                                        enum: ["top", "middle", "bottom"],
                                        default: "middle",
                                    },
                                },
                                required: ["content"],
                            },
                        },
                        style: {
                            type: "object",
                            description: "Styling options for the connector and its captions",
                            properties: {
                                color: {
                                    type: "string",
                                    description: "Color for caption text",
                                    default: "#1a1a1a",
                                },
                                endStrokeCap: {
                                    type: "string",
                                    description: "End decoration of the connector",
                                    enum: ["none", "stealth", "arrow", "circle"],
                                    default: "stealth",
                                },
                                fontSize: {
                                    type: "string",
                                    description: "Font size of the captions (10 to 288 dp)",
                                    default: "14",
                                },
                                startStrokeCap: {
                                    type: "string",
                                    description: "Start decoration of the connector",
                                    enum: ["none", "stealth", "arrow", "circle"],
                                    default: "none",
                                },
                                strokeColor: {
                                    type: "string",
                                    description: "Color of the connector line",
                                    default: "#000000",
                                },
                                strokeStyle: {
                                    type: "string",
                                    description: "Stroke pattern of the connector line",
                                    enum: ["normal", "dotted", "dashed"],
                                    default: "normal",
                                },
                                strokeWidth: {
                                    type: "string",
                                    description: "Thickness of the connector line (1 to 24)",
                                    default: "1",
                                },
                                textOrientation: {
                                    type: "string",
                                    description: "Orientation of the captions relative to the connector line",
                                    enum: ["aligned", "horizontal"],
                                    default: "aligned",
                                },
                            },
                        },
                    },
                    required: ["boardId", "startItem", "endItem"],
                },
            },
            {
                name: "get_connector",
                description: "Retrieve information for a specific connector on a Miro board.",
                inputSchema: {
                    type: "object",
                    properties: {
                        boardId: {
                            type: "string",
                            description: "Unique identifier (ID) of the board.",
                        },
                        connectorId: {
                            type: "string",
                            description: "Unique identifier (ID) of the connector to retrieve.",
                        },
                    },
                    required: ["boardId", "connectorId"],
                },
            },
            {
                name: "update_connector",
                description: "Update a connector on a Miro board using provided position, style, and caption data.",
                inputSchema: {
                    type: "object",
                    properties: {
                        boardId: {
                            type: "string",
                            description: "Unique identifier (ID) of the board.",
                        },
                        connectorId: {
                            type: "string",
                            description: "Unique identifier (ID) of the connector to update.",
                        },
                        startItem: {
                            type: "object",
                            description: "Starting point of the connector.",
                            properties: {
                                id: { type: "string" },
                                position: {
                                    type: "object",
                                    properties: {
                                        x: { type: "number" },
                                        y: { type: "number" },
                                    },
                                },
                                snapTo: { type: "string" },
                            },
                        },
                        endItem: {
                            type: "object",
                            description: "Ending point of the connector.",
                            properties: {
                                id: { type: "string" },
                                position: {
                                    type: "object",
                                    properties: {
                                        x: { type: "number" },
                                        y: { type: "number" },
                                    },
                                },
                                snapTo: { type: "string" },
                            },
                        },
                        shape: {
                            type: "string",
                            description: "The path type of the connector line, defines curvature.",
                        },
                        captions: {
                            type: "array",
                            description: "Blocks of text displayed on the connector.",
                            items: {
                                type: "object",
                                properties: {
                                    content: { type: "string" },
                                    position: { type: "string" },
                                    textAlignVertical: { type: "string" },
                                },
                                required: ["content"],
                            },
                        },
                        style: {
                            type: "object",
                            description: "Style configuration for the connector.",
                            properties: {
                                color: { type: "string" },
                                endStrokeCap: {
                                    type: "string",
                                    enum: [
                                        "none",
                                        "stealth",
                                        "rounded_stealth",
                                        "diamond",
                                        "filled_diamond",
                                        "oval",
                                        "filled_oval",
                                        "arrow",
                                        "triangle",
                                        "filled_triangle",
                                        "erd_one",
                                        "erd_many",
                                        "erd_only_one",
                                        "erd_zero_or_one",
                                        "erd_one_or_many",
                                        "erd_zero_or_many",
                                        "unknown"
                                    ],
                                    description: "The decoration cap of the connector end."
                                },
                                startStrokeCap: {
                                    type: "string",
                                    enum: [
                                        "none",
                                        "stealth",
                                        "rounded_stealth",
                                        "diamond",
                                        "filled_diamond",
                                        "oval",
                                        "filled_oval",
                                        "arrow",
                                        "triangle",
                                        "filled_triangle",
                                        "erd_one",
                                        "erd_many",
                                        "erd_only_one",
                                        "erd_zero_or_one",
                                        "erd_one_or_many",
                                        "erd_zero_or_many",
                                        "unknown"
                                    ],
                                    description: "The decoration cap of the connector start."
                                },
                                fontSize: { type: "string" },
                                strokeColor: { type: "string" },
                                strokeStyle: {
                                    type: "string", enum: [
                                        "normal",
                                        "dotted",
                                        "dashed"
                                    ],
                                },
                                strokeWidth: { type: "string" },
                                textOrientation: {
                                    type: "string",
                                    enum: [
                                        "horizontal",
                                        "aligned"
                                    ],
                                },
                            },
                        },
                    },
                    required: ["boardId", "connectorId"],
                },
            },
            // {
            //   name: "get_logo",
            //   description: "Fetch appropriate logos of each tool.",
            //   inputSchema: {
            //     type: "object",
            //     properties: {
            //       boardId: {
            //         type: "string",
            //         description: "Unique identifier (ID) of the board where to add the image.",
            //       },
            //       imageFileName: {
            //         type: "string",
            //         description: "Name of the image file to use (e.g. 'amazon-s3-logo.png', 'amazon-s3-title.png').",
            //         enum: [
            //           "amazon-s3-logo.png",
            //           "amazon-s3-title.png",
            //           "appleMusic-logo.png",
            //           "appleTv-logo.png",
            //           "aws-logo.png",
            //           "calendar-logo.png",
            //           "dataPipeline-logo.png",
            //           "docker-logo.png",
            //           "docker-title.png",
            //           "fastapi-logo.png",
            //           "fastapi-title.png",
            //           "insights-logo.png",
            //           "keynote-logo.png",
            //           "llm-logo.png",
            //           "mail-logo.png",
            //           "miro-logo.png",
            //           "miro-title.png",
            //           "orchestrator-logo.png",
            //           "quip-logo.png",
            //           "quip-title.png",
            //           "radar-logo.png",
            //           "react-logo.png",
            //           "react-title.png",
            //           "sagemaker-logo.png",
            //           "slack-logo.png",
            //           "slack-title.png",
            //           "snowflake-logo.png",
            //           "snowflake-title.png",
            //           "tigergraph-logo.png",
            //           "tigergraph-title.png",
            //           "webex-logo.png",
            //           "amazon-s3-logo.png",
            //         ],
            //       },
            //       title: {
            //         type: "string",
            //         description: "Optional title text to describe the image (used for altText).",
            //       },
            //       position: {
            //         type: "object",
            //         description: "Optional position of the image on the board.",
            //         properties: {
            //           x: { type: "number" },
            //           y: { type: "number" },
            //         },
            //       },
            //       geometry: {
            //         type: "object",
            //         description: "Optional geometry to set width, height, rotation.",
            //         properties: {
            //           width: { type: "number" },
            //           height: { type: "number" },
            //           rotation: { type: "number" },
            //         },
            //       },
            //     },
            //     required: ["boardId", "imageFileName"],
            //   }
            // },
            {
                name: "get_logo",
                description: "Fetch appropriate logos of each tool.",
                inputSchema: {
                    type: "object",
                    properties: {
                        boardId: {
                            type: "string",
                            description: "Unique identifier (ID) of the Miro board where the image will be uploaded."
                        },
                        imageFileName: {
                            type: "string",
                            description: "Name of the image file located in the 'static' folder to upload (e.g., 'miro-logo.png').",
                            enum: [
                                "amazon-s3-logo.png", "amazon-s3-title.png", "appleMusic-logo.png", "appleTv-logo.png", "aws-logo.png",
                                "calendar-logo.png", "dataPipeline-logo.png", "docker-logo.png", "docker-title.png", "fastapi-logo.png",
                                "fastapi-title.png", "insights-logo.png", "keynote-logo.png", "llm-logo.png", "mail-logo.png",
                                "miro-logo.png", "miro-title.png", "orchestrator-logo.png", "quip-logo.png", "quip-title.png",
                                "radar-logo.png", "react-logo.png", "react-title.png", "sagemaker-logo.png", "slack-logo.png",
                                "slack-title.png", "snowflake-logo.png", "snowflake-title.png", "tigergraph-logo.png",
                                "tigergraph-title.png", "webex-logo.png"
                            ]
                        },
                        title: {
                            type: "string",
                            description: "Optional title for the image (used as the image title on the board)."
                        },
                        altText: {
                            type: "string",
                            description: "Optional alt text for accessibility."
                        },
                        position: {
                            type: "object",
                            description: "Optional position of the image on the board.",
                            properties: {
                                x: { type: "number" },
                                y: { type: "number" },
                                origin: {
                                    type: "string",
                                    enum: ["center", "top_left", "top_right", "bottom_left", "bottom_right"],
                                    default: "center"
                                }
                            },
                            required: ["x", "y"] // Optional: only if you want to enforce position coordinates
                        },
                        geometry: {
                            type: "object",
                            description: "Optional geometry parameters (e.g., width, height, rotation).",
                            properties: {
                                width: { type: "number" },
                                height: { type: "number" },
                                rotation: { type: "number" }
                            }
                        },
                        parentId: {
                            type: ["string", "null"],
                            description: "Optional parent frame ID. If null, image is attached directly to canvas.",
                            default: null
                        }
                    },
                    required: ["boardId", "imageFileName"]
                }
            },
            {
                name: "create_shape",
                description: "Create a shape on a Miro board. Available shapes include basic shapes (rectangle, circle, etc.) and flowchart shapes (process, decision, etc.). Standard geometry specs: width and height in pixels (default 200x200)",
                inputSchema: {
                    type: "object",
                    properties: {
                        boardId: {
                            type: "string",
                            description: "ID of the board to create the shape on",
                        },
                        content: {
                            type: "string",
                            description: "Text content to display on the shape",
                        },
                        shape: {
                            type: "string",
                            description: "Type of shape to create",
                            enum: [
                                // Basic shapes
                                "rectangle",
                                "round_rectangle",
                                "circle",
                                "triangle",
                                "rhombus",
                                "parallelogram",
                                "trapezoid",
                                "pentagon",
                                "hexagon",
                                "octagon",
                                "wedge_round_rectangle_callout",
                                "star",
                                "flow_chart_predefined_process",
                                "cloud",
                                "cross",
                                "can",
                                "right_arrow",
                                "left_arrow",
                                "left_right_arrow",
                                "left_brace",
                                "right_brace",
                                // Flowchart shapes
                                "flow_chart_connector",
                                "flow_chart_magnetic_disk",
                                "flow_chart_input_output",
                                "flow_chart_decision",
                                "flow_chart_delay",
                                "flow_chart_display",
                                "flow_chart_document",
                                "flow_chart_magnetic_drum",
                                "flow_chart_internal_storage",
                                "flow_chart_manual_input",
                                "flow_chart_manual_operation",
                                "flow_chart_merge",
                                "flow_chart_multidocuments",
                                "flow_chart_note_curly_left",
                                "flow_chart_note_curly_right",
                                "flow_chart_note_square",
                                "flow_chart_offpage_connector",
                                "flow_chart_or",
                                "flow_chart_predefined_process_2",
                                "flow_chart_preparation",
                                "flow_chart_process",
                                "flow_chart_online_storage",
                                "flow_chart_summing_junction",
                                "flow_chart_terminator",
                            ],
                            default: "rectangle",
                        },
                        style: {
                            type: "object",
                            description: "Style configuration for the shape",
                            properties: {
                                borderColor: { type: "string" },
                                borderOpacity: { type: "number", minimum: 0, maximum: 1 },
                                borderStyle: {
                                    type: "string",
                                    enum: ["normal", "dotted", "dashed"],
                                },
                                borderWidth: { type: "number", minimum: 1, maximum: 24 },
                                color: { type: "string" },
                                fillColor: { type: "string" },
                                fillOpacity: { type: "number", minimum: 0, maximum: 1 },
                                fontFamily: { type: "string" },
                                fontSize: { type: "number", minimum: 10, maximum: 288 },
                                textAlign: {
                                    type: "string",
                                    enum: ["left", "center", "right"],
                                },
                                textAlignVertical: {
                                    type: "string",
                                    enum: ["top", "middle", "bottom"],
                                },
                            },
                        },
                        position: {
                            type: "object",
                            properties: {
                                x: { type: "number", default: 0 },
                                y: { type: "number", default: 0 },
                                origin: { type: "string", default: "center" },
                            },
                        },
                        geometry: {
                            type: "object",
                            properties: {
                                width: { type: "number", default: 200 },
                                height: { type: "number", default: 200 },
                                rotation: { type: "number", default: 0 },
                            },
                        },
                    },
                    required: ["boardId", "shape"],
                },
            },
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
        case "list_boards": {
            const boards = await miroClient.getBoards();
            return {
                content: [
                    {
                        type: "text",
                        text: "Here are the available Miro boards:",
                    },
                    ...boards.map((b) => ({
                        type: "text",
                        text: `Board ID: ${b.id}, Name: ${b.name}`,
                    })),
                ],
            };
        }
        case "create_sticky_note": {
            const { boardId, content, color = "yellow", x = 0, y = 0, } = request.params.arguments;
            const stickyNote = await miroClient.createStickyNote(boardId, {
                data: {
                    content: content,
                },
                style: {
                    fillColor: color,
                },
                position: {
                    x: x,
                    y: y,
                },
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Created sticky note ${stickyNote.id} on board ${boardId}`,
                    },
                ],
            };
        }
        case "create_connector": {
            const { boardId, startItem, endItem, shape, captions, style } = request.params.arguments;
            const connectorItem = await miroClient.createConnector(boardId, {
                startItem,
                endItem,
                shape: shape || "curved",
                captions: captions || [],
                style: style || {}
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Created connector between ${startItem.id} and ${endItem.id} with ID ${connectorItem.id} on board ${boardId}`,
                    },
                ],
            };
        }
        case "get_logo": {
            const { boardId, imageFileName, title, altText, position, geometry, parentId, } = request.params.arguments;
            const imageItem = await miroClient.getLogo(boardId, imageFileName, {
                title: title || imageFileName,
                altText: altText || "",
                position: position || { x: 0, y: 0, origin: "center" },
                geometry: geometry || { width: 200 },
                parentId: parentId || null,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Uploaded image '${imageFileName}' with ID ${imageItem.id} on board ${boardId}`,
                    },
                ],
            };
        }
        case "bulk_create_items": {
            const { boardId, items } = request.params.arguments;
            const createdItems = await miroClient.bulkCreateItems(boardId, items);
            return {
                content: [
                    {
                        type: "text",
                        text: `Created ${createdItems.length} items on board ${boardId}`,
                    },
                ],
            };
        }
        case "get_frames": {
            const { boardId } = request.params.arguments;
            const frames = await miroClient.getFrames(boardId);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(frames, null, 2),
                    },
                ],
            };
        }
        case "get_items_in_frame": {
            const { boardId, frameId } = request.params.arguments;
            const items = await miroClient.getItemsInFrame(boardId, frameId);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(items, null, 2),
                    },
                ],
            };
        }
        case "create_shape": {
            const { boardId, shape, content, style, position, geometry } = request
                .params.arguments;
            const shapeItem = await miroClient.createShape(boardId, {
                data: {
                    shape: shape,
                    content: content,
                },
                style: style || {},
                position: position || { x: 0, y: 0 },
                geometry: geometry || { width: 200, height: 200, rotation: 0 },
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Created ${shape} shape with ID ${shapeItem.id} on board ${boardId}`,
                    },
                ],
            };
        }
        default:
            throw new Error("Unknown tool");
    }
});
server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
        prompts: [
            {
                name: "Working with MIRO",
                description: "Basic prompt for working with MIRO boards",
            },
        ],
    };
});
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    if (request.params.name === "Working with MIRO") {
        const keyFactsPath = path.join(process.cwd(), 'resources', 'boards-key-facts.md');
        const keyFacts = await fs.readFile(keyFactsPath, 'utf-8');
        return {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: keyFacts,
                    },
                },
            ],
        };
    }
    throw new Error("Unknown prompt");
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
