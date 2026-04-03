<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        $row = static::query()->where('key', $key)->first();

        if (! $row) {
            return $default;
        }

        return static::decodeValue($row->value, $default);
    }

    public static function setValue(string $key, mixed $value): void
    {
        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => json_encode($value, JSON_UNESCAPED_UNICODE)]
        );
    }

    public static function setMany(array $keyValuePairs): void
    {
        foreach ($keyValuePairs as $key => $value) {
            static::setValue((string) $key, $value);
        }
    }

    public static function getManyWithDefaults(array $defaults): array
    {
        $rows = static::query()
            ->whereIn('key', array_keys($defaults))
            ->get(['key', 'value'])
            ->keyBy('key');

        $result = [];

        foreach ($defaults as $key => $default) {
            if (! isset($rows[$key])) {
                $result[$key] = $default;
                continue;
            }

            $result[$key] = static::decodeValue($rows[$key]->value, $default);
        }

        return $result;
    }

    private static function decodeValue(mixed $raw, mixed $default = null): mixed
    {
        if ($raw === null) {
            return $default;
        }

        if (! is_string($raw)) {
            return $raw;
        }

        $decoded = json_decode($raw, true);

        return json_last_error() === JSON_ERROR_NONE ? $decoded : $default;
    }
}

