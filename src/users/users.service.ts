import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getById(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  async getBySub(googleSub: string) {
    return this.userRepository.findOne({ where: { googleSub } });
  }

  async getByEmail(email: string) {
    return this.userRepository.findOne({ where: { email: ILike(email) } });
  }

  async list() {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: string) {
    return this.userRepository.delete(id);
  }
}
