/**
 * TESTS DE FAVORITOS
 *
 * Testea el endpoint PATCH /api/movies/:id/favorite
 * que alterna el campo isFavorite (true ↔ false).
 */

const request = require('supertest');

// ============================================
// CONFIGURACIÓN DE MOCKS
// ============================================
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  movie: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('../lib/prisma', () => mockPrisma);

jest.mock('../middleware/authMiddleware', () => {
  return (req, res, next) => {
    req.user = { userId: 'user-123' };
    next();
  };
});

const app = require('../server');
const prisma = require('../lib/prisma');

// ============================================
// SUITE DE TESTS: FAVORITOS
// ============================================
describe('API de Favoritos', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH /api/movies/:id/favorite', () => {

    it('debería marcar como favorita una película que no lo es', async () => {
      // ARRANGE
      const peliculaMock = {
        id: 'movie-1',
        title: 'Inception',
        director: 'Christopher Nolan',
        year: 2010,
        posterUrl: 'https://example.com/inception.jpg',
        isFavorite: false,
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const peliculaActualizada = { ...peliculaMock, isFavorite: true };

      prisma.movie.findFirst.mockResolvedValue(peliculaMock);
      prisma.movie.update.mockResolvedValue(peliculaActualizada);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.isFavorite).toBe(true);
      expect(prisma.movie.findFirst).toHaveBeenCalledWith({
        where: { id: 'movie-1', ownerId: 'user-123' },
      });
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-1' },
        data: { isFavorite: true },
      });
    });

    it('debería desmarcar como favorita una película que ya lo es', async () => {
      // ARRANGE
      const peliculaMock = {
        id: 'movie-1',
        title: 'Inception',
        director: 'Christopher Nolan',
        year: 2010,
        posterUrl: 'https://example.com/inception.jpg',
        isFavorite: true,
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const peliculaActualizada = { ...peliculaMock, isFavorite: false };

      prisma.movie.findFirst.mockResolvedValue(peliculaMock);
      prisma.movie.update.mockResolvedValue(peliculaActualizada);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.isFavorite).toBe(false);
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-1' },
        data: { isFavorite: false },
      });
    });

    it('debería devolver 404 si la película no existe', async () => {
      // ARRANGE
      prisma.movie.findFirst.mockResolvedValue(null);

      // ACT
      const response = await request(app)
        .patch('/api/movies/no-existe/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Película no encontrada');
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    it('debería devolver 404 si la película pertenece a otro usuario', async () => {
      // ARRANGE
      prisma.movie.findFirst.mockResolvedValue(null);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-otro-user/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Película no encontrada');
    });

    it('debería devolver 500 si ocurre un error en el servidor', async () => {
      // ARRANGE
      prisma.movie.findFirst.mockRejectedValue(new Error('DB connection error'));

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al actualizar favorito');
    });
  });
});
