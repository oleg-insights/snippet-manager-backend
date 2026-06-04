import { ApiProperty } from '@nestjs/swagger';
import { UserPrivateResponseDto } from '../../users/dto/user-private-response.dto';

export class LoginUserResponseDto {
    @ApiProperty({ type: () => UserPrivateResponseDto })
    user: UserPrivateResponseDto;

    @ApiProperty({
        example:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        description: 'Access-токен',
    })
    accessToken: string;
}
