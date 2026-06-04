import xss from 'xss';
import { ContentBlockDto } from 'src/templates/dto/create-template.dto';

export const sanitizeContent = (block: ContentBlockDto): ContentBlockDto => {
    const sanitize = (value: unknown): unknown => {
        if (typeof value === 'string') return xss(value);
        if (Array.isArray(value)) return value.map(sanitize);
        if (value && typeof value === 'object') {
            const sanitized: Record<string, unknown> = {};

            for (const [key, val] of Object.entries(value)) {
                sanitized[key] = sanitize(val);
            }

            return sanitized;
        }
        return value;
    };

    return { ...block, data: sanitize(block.data) };
};
