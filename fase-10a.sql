-- Fase 10A. Owner dapat mengatur aturan genset dari dashboard (Pengaturan). Aman dijalankan ulang.
-- Aturan disimpan atomik: semua baris diganti dalam satu transaksi, jadi tabel tidak pernah setengah terisi.
-- RLS tabel genset_rules TIDAK diubah (publik tetap membaca seperti sebelumnya).

create or replace function public.save_genset_rules(p_rules jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  prev_max integer := null;
  prev_open boolean := false;
  n integer;
begin
  if auth.uid() is null
     or not exists (select 1 from public.admins a where a.id = auth.uid() and a.role = 'owner') then
    raise exception 'FORBIDDEN: hanya owner' using errcode = '42501';
  end if;

  if p_rules is null or jsonb_typeof(p_rules) <> 'array' then
    raise exception 'Format aturan tidak valid' using errcode = '22023';
  end if;
  n := jsonb_array_length(p_rules);
  if n > 20 then
    raise exception 'Maksimal 20 aturan' using errcode = '22023';
  end if;

  -- Validasi berurutan menurut min_ac: tidak boleh tumpang tindih, hanya baris terakhir boleh tanpa batas atas
  for r in
    select (x->>'min_ac')::int as min_ac, nullif(x->>'max_ac', '')::int as max_ac, (x->>'kva')::int as kva
      from jsonb_array_elements(p_rules) x
     order by (x->>'min_ac')::int
  loop
    if r.min_ac < 1 or r.kva < 1 or r.kva > 5000 or r.min_ac > 1000 then
      raise exception 'Jumlah AC dan kVA harus bilangan positif yang wajar' using errcode = '22023';
    end if;
    if r.max_ac is not null and r.max_ac < r.min_ac then
      raise exception 'Batas atas % lebih kecil dari batas bawah %', r.max_ac, r.min_ac using errcode = '22023';
    end if;
    if prev_open then
      raise exception 'Aturan tanpa batas atas harus menjadi baris terakhir' using errcode = '22023';
    end if;
    if prev_max is not null and r.min_ac <= prev_max then
      raise exception 'Rentang AC tumpang tindih di sekitar % unit', r.min_ac using errcode = '22023';
    end if;
    prev_max := r.max_ac;
    prev_open := (r.max_ac is null);
  end loop;

  delete from public.genset_rules where true;
  insert into public.genset_rules (min_ac, max_ac, kva)
  select (x->>'min_ac')::int, nullif(x->>'max_ac', '')::int, (x->>'kva')::int
    from jsonb_array_elements(p_rules) x;
end;
$$;

revoke all on function public.save_genset_rules(jsonb) from public, anon;
grant execute on function public.save_genset_rules(jsonb) to authenticated;
