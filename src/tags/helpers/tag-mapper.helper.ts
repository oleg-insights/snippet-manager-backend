import { Tag } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { TagResponseDto } from 'src/tags/dto/tag-response.dto';

export const toTagResponseDto = (tag: Tag): TagResponseDto => {
    return plainToInstance(TagResponseDto, tag, {
        excludeExtraneousValues: true,
    });
};
