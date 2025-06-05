
import fetch from 'node-fetch';

interface MiroBoard {
  id: string;
  name: string;
  description?: string;
}

interface MiroBoardsResponse {
  data: MiroBoard[];
  total: number;
  size: number;
  offset: number;
}

interface MiroItem {
  id: string;
  type: string;
  [key: string]: any;
}

interface MiroConnectorList {
  data: MiroItem[];         // List of connector items
  size: number;             // Number of items returned in this page
  limit?: number;           // The limit used in the query
  cursor?: string;          // Cursor for fetching the next page
}

interface MiroItemsResponse {
  data: MiroItem[];
  cursor?: string;
}

export class MiroClient {
  constructor(private token: string) { }

  private async fetchApi(path: string, options: { method?: string; body?: any } = {}) {
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

  async getBoards(): Promise<MiroBoard[]> {
    const response = await this.fetchApi('/boards') as MiroBoardsResponse;
    return response.data;
  }

  async getConnector(boardId: string, connectorId: string): Promise<MiroItem> {
    return this.fetchApi(`/boards/${boardId}/connectors/${connectorId}`, {
      method: 'GET'
    }) as Promise<MiroItem>;
  }

  async getBoardItems(boardId: string): Promise<MiroItem[]> {
    const response = await this.fetchApi(`/boards/${boardId}/items?limit=50`) as MiroItemsResponse;
    return response.data;
  }

  async createStickyNote(boardId: string, data: any): Promise<MiroItem> {
    return this.fetchApi(`/boards/${boardId}/sticky_notes`, {
      method: 'POST',
      body: data
    }) as Promise<MiroItem>;
  }

  async bulkCreateItems(boardId: string, items: any[]): Promise<MiroItem[]> {
    const response = await fetch(`https://api.miro.com/v2/boards/${boardId}/items/bulk`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(items)
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(`Miro API error: ${error.message || response.statusText}`);
    }

    const result = await response.json() as { data: MiroItem[] };
    return result.data || [];
  }

  async getFrames(boardId: string): Promise<MiroItem[]> {
    const response = await this.fetchApi(`/boards/${boardId}/items?type=frame&limit=50`) as MiroItemsResponse;
    return response.data;
  }

  async getItemsInFrame(boardId: string, frameId: string): Promise<MiroItem[]> {
    const response = await this.fetchApi(`/boards/${boardId}/items?parent_item_id=${frameId}&limit=50`) as MiroItemsResponse;
    return response.data;
  }

  async createShape(boardId: string, data: any): Promise<MiroItem> {
    return this.fetchApi(`/boards/${boardId}/shapes`, {
      method: 'POST',
      body: data
    }) as Promise<MiroItem>;
  }


  async getLogo(
    boardId: string,
    data: {
      imageFileName: string;
      title?: string;
      position?: { x?: number; y?: number };
      geometry?: { width?: number; height?: number; rotation?: number };
    }
  ): Promise<MiroItem> {
    const { imageFileName, title, position, geometry } = data;

    const payload: any = {
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
    }) as Promise<MiroItem>;
  };



  async updateConnector(
    boardId: string,
    connectorId: string,
    data: any // You can replace 'any' with a proper type/interface for connector update payload
  ): Promise<MiroItem> {
    return this.fetchApi(`/boards/${boardId}/connectors/${connectorId}`, {
      method: 'PATCH',
      body: data
    }) as Promise<MiroItem>;
  }

  async createConnector(boardId: string, data: any): Promise<MiroItem> {
    return this.fetchApi(`/boards/${boardId}/connectors`, {
      method: 'POST',
      body: data
    }) as Promise<MiroItem>;
  }

  async getConnectors(boardId: string, params?: { limit?: string; cursor?: string }): Promise<MiroConnectorList> {
    const queryParams = new URLSearchParams();

    if (params?.limit) queryParams.append("limit", params.limit);
    if (params?.cursor) queryParams.append("cursor", params.cursor);

    const url = `/boards/${boardId}/connectors?${queryParams.toString()}`;
    return this.fetchApi(url, {
      method: "GET"
    }) as Promise<MiroConnectorList>;
  }

}