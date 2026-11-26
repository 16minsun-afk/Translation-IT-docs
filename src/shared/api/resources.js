const idPath = id => encodeURIComponent(String(id));

// UI 없이도 재사용할 수 있는 문서/번역/요약/용어집 통신 모듈입니다.
export function createResources(request) {
  return {
    documents: {
      list: options => request('/documents', options),
      get: (id, options) => request(`/documents/${idPath(id)}`, options),
      upload(file, title, options = {}) {
        if (!/\.(txt|md)$/i.test(file.name)) throw new Error('txt 또는 md 파일만 업로드할 수 있습니다.');
        if (file.size > 5 * 1024 * 1024) throw new Error('최대 파일 크기는 5MB입니다.');
        const body = new FormData(); body.append('file', file);
        if (title) body.append('title', title);
        return request('/documents', { ...options, method: 'POST', body });
      },
      remove: id => request(`/documents/${idPath(id)}`, { method: 'DELETE' }),
      translate: id => request(`/documents/${idPath(id)}/translate`, { method: 'POST' }),
      retry: id => request(`/documents/${idPath(id)}/retry`, { method: 'POST' }),
      segments: (id, options) => request(`/documents/${idPath(id)}/segments`, options),
      updateSegment: (id, translatedText) => request(`/segments/${idPath(id)}`, { method: 'PATCH', body: { translatedText } }),
      summarize: (id, length) => request(`/documents/${idPath(id)}/summarize`, { method: 'POST', body: { length } }),
      summary: (id, options) => request(`/documents/${idPath(id)}/summary`, options),
      download: (id, { type = 'full', format = 'md', signal } = {}) => request(`/documents/${idPath(id)}/result?${new URLSearchParams({ type, format })}`, { responseType: 'blob', signal })
    },
    terms: {
      list: options => request('/terms', options),
      create: body => request('/terms', { method: 'POST', body }),
      update: (id, body) => request(`/terms/${idPath(id)}`, { method: 'PUT', body }),
      remove: id => request(`/terms/${idPath(id)}`, { method: 'DELETE' })
    }
  };
}
