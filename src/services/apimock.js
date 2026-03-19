const mockData = [
  {
    author: 'juan',
    name: 'house',
    points: [
      { x: 10, y: 10 },
      { x: 100, y: 10 },
      { x: 100, y: 100 },
      { x: 10, y: 100 },
    ],
  },
  {
    author: 'juan',
    name: 'tree',
    points: [
      { x: 50, y: 10 },
      { x: 80, y: 80 },
      { x: 20, y: 80 },
    ],
  },
  {
    author: 'maria',
    name: 'car',
    points: [
      { x: 20, y: 50 },
      { x: 120, y: 50 },
      { x: 120, y: 90 },
      { x: 20, y: 90 },
    ],
  },
]

const apimock = {
  getAll: async () => {
    return Promise.resolve([...mockData])
  },

  getByAuthor: async (author) => {
    const result = mockData.filter((bp) => bp.author === author)
    return Promise.resolve(result)
  },

  getByAuthorAndName: async (author, name) => {
    const result = mockData.find(
      (bp) => bp.author === author && bp.name === name,
    )
    return Promise.resolve(result)
  },

  create: async (blueprint) => {
    mockData.push(blueprint)
    return Promise.resolve(blueprint)
  },
}

export default apimock