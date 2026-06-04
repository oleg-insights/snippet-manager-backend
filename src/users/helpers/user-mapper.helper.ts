import { User } from '@prisma/client';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { UserPublicResponseDto } from 'src/users/dto/user-public-response.dto';
import { UserPrivateResponseDto } from 'src/users/dto/user-private-response.dto';
import { UserAdminResponseDto } from 'src/users/dto/user-admin-response.dto';

export const toUserDto = <T>(dto: ClassConstructor<T>, user: User): T => {
    return plainToInstance(dto, user, {
        excludeExtraneousValues: true,
    });
};

export const toUserPublicDto = (user: User): UserPublicResponseDto => {
    return toUserDto(UserPublicResponseDto, user);
};

export const toUserPrivateDto = (user: User): UserPrivateResponseDto => {
    return toUserDto(UserPrivateResponseDto, user);
};

export const toUserAdminDto = (user: User): UserAdminResponseDto => {
    return toUserDto(UserAdminResponseDto, user);
};
