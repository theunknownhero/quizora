-- Rename the site from Quizora to QuizBit in text stored in the database
-- (maintenance message, tournament templates and existing tournaments' rules). Safe to run again.
update public.site_settings
  set value = replace(value::text, 'Quizora', 'QuizBit')::jsonb, updated_at = now()
  where value::text like '%Quizora%';

update public.tournaments
  set title = replace(title, 'Quizora', 'QuizBit'),
      description = replace(description, 'Quizora', 'QuizBit'),
      terms = replace(terms, 'Quizora', 'QuizBit')
  where concat_ws(' ', title, description, terms) like '%Quizora%';

select (select count(*) from public.site_settings where value::text like '%Quizora%') as settings_left,
       (select count(*) from public.tournaments where concat_ws(' ', title, description, terms) like '%Quizora%') as tournaments_left;
