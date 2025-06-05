import fetch from 'node-fetch';
export class MiroClient {
    token;
    constructor(token) {
        this.token = token;
    }
    async fetchApi(path, options = {}) {
        const response = await fetch(`https://api.miro.com/v2${path}`, {
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            ...(options.body ? { body: JSON.stringify(options.body) } : {})
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
    async bulkCreateItems(boardId, items) {
        const response = await fetch(`https://api.miro.com/v2/boards/${boardId}/items/bulk`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(items)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Miro API error: ${error.message || response.statusText}`);
        }
        const result = await response.json();
        return result.data || [];
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
    async getLogo(boardId, data) {
        const { imageFileName, title, position, geometry } = data;
        const payload = {
            url: `http://localhost:3003/static/${imageFileName}`,
        };
        if (title) {
            payload.title = title;
            payload.altText = title;
        }
        if (position) {
            payload.position = position;
        }
        if (geometry) {
            payload.geometry = geometry;
        }
        return this.fetchApi(`/boards/${boardId}/images`, {
            method: "POST",
            body: payload,
        });
    }
    ;
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
