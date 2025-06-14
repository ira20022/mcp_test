import fetch from 'node-fetch';
// import * as fs from "fs/promises";
// import * as path from "path";
import { fileURLToPath } from 'url';
import path from 'path';
import * as fs from 'fs/promises';
import FormData from 'form-data';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class MiroClient {
    token;
    constructor(token) {
        this.token = token;
    }
    // private async fetchApi(path: string, options: { method?: string; body?: any } = {}) {
    //   const response = await fetch(`https://api.miro.com/v2${path}`, {
    //     method: options.method || 'GET',
    //     headers: {
    //       'Authorization': `Bearer ${this.token}`,
    //       'Content-Type': 'application/json'
    //     },
    //     ...(options.body ? { body: JSON.stringify(options.body) } : {})
    //   });
    //   if (!response.ok) {
    //     throw new Error(`Miro API error: ${response.status} ${response.statusText}`);
    //   }
    //   return response.json();
    // }
    async fetchApi(path, options = {}) {
        const isFormData = options.body instanceof FormData;
        const headers = {
            'Authorization': `Bearer ${this.token}`,
        };
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }
        const response = await fetch(`https://api.miro.com/v2${path}`, {
            method: options.method || 'GET',
            headers,
            body: options.body && !isFormData ? JSON.stringify(options.body) : options.body,
        });
        if (!response.ok) {
            throw new Error(`Miro API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    async getBoards() {
        const response = await this.fetchApi('/boards');
        return response.data;
    }
    async getConnector(boardId, connectorId) {
        return this.fetchApi(`/boards/${boardId}/connectors/${connectorId}`, {
            method: 'GET'
        });
    }
    async getBoardItems(boardId) {
        const response = await this.fetchApi(`/boards/${boardId}/items?limit=50`);
        return response.data;
    }
    async createStickyNote(boardId, data) {
        return this.fetchApi(`/boards/${boardId}/sticky_notes`, {
            method: 'POST',
            body: data
        });
    }
    // async getLogo(boardId: string, imageFileName: string, data: any): Promise<MiroItem> {
    //   const formData = new FormData();
    //   // Get file buffer from static folder
    //   const filePath = path.join(__dirname, 'static', imageFileName);
    //   const fileBuffer = await fs.readFile(filePath);
    //   formData.append("resource", fileBuffer, {
    //     filename: imageFileName,
    //     contentType: "image/png", // or infer from file extension
    //   });
    //   formData.append(
    //     "data",
    //     JSON.stringify({
    //       title: data.title || imageFileName,
    //       altText: data.altText || "",
    //       position: data.position || { x: 0, y: 0, origin: "center" },
    //       geometry: data.geometry || { width: 200 },
    //       parent: { id: data.parentId || null },
    //     })
    //   );
    //   return this.fetchApi(`/boards/${boardId}/images`, {
    //     method: "POST",
    //     body: formData,
    //   }) as Promise<MiroItem>;
    // }
    async getLogo(boardId, imageFileName, data) {
        const formData = new FormData();
        // Get absolute path to static image file
        const filePath = path.join(__dirname, "static", imageFileName);
        const fileBuffer = await fs.readFile(filePath);
        // Use fixed geometry size unless overridden
        const geometry = data.geometry || { width: 150 }; // You can adjust this to 100, 120 etc.
        const position = data.position || { x: 0, y: 0, origin: "center" };
        // Append image file
        formData.append("resource", fileBuffer, {
            filename: imageFileName,
            contentType: "image/png"
        });
        // Append metadata
        formData.append("data", JSON.stringify({
            title: data.title || imageFileName,
            altText: data.altText || "",
            position,
            geometry,
            parent: data.parentId ? { id: data.parentId } : null,
        }));
        // Send to Miro API
        const response = await fetch(`https://api.miro.com/v2/boards/${boardId}/images`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.token}`, // ensure `this.token` is valid
                ...formData.getHeaders(),
            },
            body: formData,
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Image upload failed: ${error}`);
        }
        const result = (await response.json());
        return result;
    }
    // async bulkCreateItems(boardId: string, items: any[]): Promise<MiroItem[]> {
    //   const response = await fetch(`https://api.miro.com/v2/boards/${boardId}/items/bulk`, {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Bearer ${this.token}`,
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(items)
    //   });
    //   if (!response.ok) {
    //     const error = await response.json() as { message?: string };
    //     throw new Error(`Miro API error: ${error.message || response.statusText}`);
    //   }
    //   const result = await response.json() as { data: MiroItem[] };
    //   return result.data || [];
    // }
    ALLOWED_IMAGES = new Set([
        "amazon-s3-logo.png", "insights-logo.png", "react-title.png",
        "amazon-s3-title.png", "keynote-logo.png", "sagemaker-logo.png",
        "appleMusic-logo.png", "llm-logo.png", "slack-logo.png",
        "appleTv-logo.png", "mail-logo.png", "slack-title.png",
        "aws-logo.png", "miro-logo.png", "snowflake-logo.png",
        "calendar-logo.png", "miro-title.png", "snowflake-title.png",
        "dataPipeline-logo.png", "orchestrator-logo.png", "tigergraph-logo.png",
        "docker-logo.png", "quip-logo.png", "tigergraph-title.png",
        "docker-title.png", "quip-title.png", "webex-logo.png",
        "fastapi-logo.png", "radar-logo.png",
        "fastapi-title.png", "react-logo.png"
    ]);
    async bulkCreateItems(boardId, items) {
        const createdItems = [];
        for (const item of items) {
            const fileName = item.imageFileName;
            if (fileName && this.ALLOWED_IMAGES.has(fileName)) {
                const filePath = path.join(__dirname, 'static', fileName);
                try {
                    const fileBuffer = await fs.readFile(filePath);
                    const formData = new FormData();
                    formData.append("resource", fileBuffer, {
                        filename: fileName,
                        contentType: "image/png", // Adjust if needed
                    });
                    formData.append("data", JSON.stringify({
                        title: item.title || fileName,
                        altText: item.altText || "",
                        position: item.position || { x: 0, y: 0, origin: "center" },
                        geometry: item.geometry || { width: 200 },
                        parent: { id: item.parentId || null },
                    }));
                    const response = await fetch(`https://api.miro.com/v2/boards/${boardId}/images`, {
                        method: "POST",
                        headers: {
                            ...formData.getHeaders(),
                            'Authorization': `Bearer ${this.token}`,
                        },
                        body: formData,
                    });
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(`Image upload failed: ${response.statusText}`);
                    }
                    const created = await response.json();
                    createdItems.push(created);
                }
                catch (err) {
                    console.error(`Failed to upload image: ${fileName}`, err);
                    continue; // Skip this item and proceed with the next
                }
            }
            // Remove local-only fields even if image wasn't uploaded
            delete item.imageFileName;
            delete item.title;
        }
        return createdItems;
    }
    async getFrames(boardId) {
        const response = await this.fetchApi(`/boards/${boardId}/items?type=frame&limit=50`);
        return response.data;
    }
    async getItemsInFrame(boardId, frameId) {
        const response = await this.fetchApi(`/boards/${boardId}/items?parent_item_id=${frameId}&limit=50`);
        return response.data;
    }
    async createShape(boardId, data) {
        return this.fetchApi(`/boards/${boardId}/shapes`, {
            method: 'POST',
            body: data
        });
    }
    async updateConnector(boardId, connectorId, data // You can replace 'any' with a proper type/interface for connector update payload
    ) {
        return this.fetchApi(`/boards/${boardId}/connectors/${connectorId}`, {
            method: 'PATCH',
            body: data
        });
    }
    async createConnector(boardId, data) {
        return this.fetchApi(`/boards/${boardId}/connectors`, {
            method: 'POST',
            body: data
        });
    }
    async getConnectors(boardId, params) {
        const queryParams = new URLSearchParams();
        if (params?.limit)
            queryParams.append("limit", params.limit);
        if (params?.cursor)
            queryParams.append("cursor", params.cursor);
        const url = `/boards/${boardId}/connectors?${queryParams.toString()}`;
        return this.fetchApi(url, {
            method: "GET"
        });
    }
}
