/**
 * TESTS DE RATING DE PELÍCULAS
 * 
 * Este archivo contiene tests para la funcionalidad de calificación (rating) de películas.
 * Usamos MOCKS de Prisma para no tocar la base de datos real durante los tests.
 */

const request = require('supertest');

// ============================================
// CONFIGURACIÓN DE MOCKS
// ============================================

const mockPrisma = {
  movie: {
    findFirst: jest.fn(),
    update: jest.fn(),
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
// SUITE DE TESTS: RATING DE PELÍCULAS
// ============================================
describe('API de Rating de Películas', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // CAMINO FELIZ: Rating válido
  // ==========================================
  describe('PATCH /api/movies/:id/rating - Camino Feliz', () => {
    
    it('debería actualizar el rating de una película correctamente con rating 4', async () => {
      // ARRANGE
      const peliculaExistente = {
        id: 'movie-1',
        title: 'Inception',
        director: 'Christopher Nolan',
        year: 2010,
        posterUrl: 'https://example.com/inception.jpg',
        rating: 0,
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const peliculaConRating = {
        ...peliculaExistente,
        rating: 4,
      };

      // Mock: primero verifica que la película existe
      prisma.movie.findFirst.mockResolvedValue(peliculaExistente);
      // Mock: luego actualiza el rating
      prisma.movie.update.mockResolvedValue(peliculaConRating);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 4 });

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(4);
      expect(response.body.title).toBe('Inception');
      expect(prisma.movie.findFirst).toHaveBeenCalledWith({
        where: { id: 'movie-1', ownerId: 'user-123' },
      });
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-1' },
        data: { rating: 4 },
      });
    });

    it('debería permitir rating 0 (marcar como no valorada)', async () => {
      // ARRANGE
      const peliculaConRating = {
        id: 'movie-1',
        title: 'Inception',
        director: 'Christopher Nolan',
        year: 2010,
        posterUrl: 'https://example.com/inception.jpg',
        rating: 0,
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.movie.findFirst.mockResolvedValue(peliculaConRating);
      prisma.movie.update.mockResolvedValue(peliculaConRating);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 0 });

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(0);
    });

    it('debería permitir rating 5 (máximo)', async () => {
      // ARRANGE
      const peliculaConRating = {
        id: 'movie-1',
        title: 'Inception',
        director: 'Christopher Nolan',
        year: 2010,
        posterUrl: 'https://example.com/inception.jpg',
        rating: 5,
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.movie.findFirst.mockResolvedValue(peliculaConRating);
      prisma.movie.update.mockResolvedValue(peliculaConRating);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 5 });

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(5);
    });
  });

  // ==========================================
  // CAMINOS TRISTES: Validaciones
  // ==========================================
  describe('PATCH /api/movies/:id/rating - Caminos Tristes', () => {
    
    it('debería devolver 400 si rating está ausente en el body', async () => {
      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({}); // Sin rating

      // ASSERT
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El campo rating es requerido');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

    it('debería devolver 400 si rating es 6 (fuera de rango)', async () => {
      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 6 });

      // ASSERT
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El rating debe ser un número entero entre 0 y 5');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

    it('debería devolver 400 si rating es negativo', async () => {
      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: -1 });

      // ASSERT
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El rating debe ser un número entero entre 0 y 5');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

    it('debería devolver 400 si rating no es un número entero (ej: 3.5)', async () => {
      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 3.5 });

      // ASSERT
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El rating debe ser un número entero entre 0 y 5');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

    it('debería devolver 404 si la película no existe', async () => {
      // ARRANGE
      prisma.movie.findFirst.mockResolvedValue(null);

      // ACT
      const response = await request(app)
        .patch('/api/movies/no-existe/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 4 });

      // ASSERT
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Película no encontrada');
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    it('debería devolver 404 si la película no pertenece al usuario', async () => {
      // ARRANGE
      // Simula que el usuario intenta calificar una película de otro usuario
      prisma.movie.findFirst.mockResolvedValue(null);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-otros-usuario/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 5 });

      // ASSERT
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Película no encontrada');
      expect(prisma.movie.findFirst).toHaveBeenCalledWith({
        where: { id: 'movie-otros-usuario', ownerId: 'user-123' },
      });
    });
  });
});