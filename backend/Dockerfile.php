FROM php:8.2-apache

# Install only required PHP extensions: MySQL (mysqli) and Redis (no PDO)
ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

RUN install-php-extensions mysqli redis

# Enable Apache modules
RUN a2enmod rewrite headers

# Point Apache DocumentRoot directly to /var/www/html/Api so direct URL works without /Api/
ENV APACHE_DOCUMENT_ROOT=/var/www/html/Api
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Configure PHP settings (upload limits, execution time, memory)
RUN echo "upload_max_filesize = 128M" > /usr/local/etc/php/conf.d/custom.ini \
    && echo "post_max_size = 128M" >> /usr/local/etc/php/conf.d/custom.ini \
    && echo "memory_limit = 512M" >> /usr/local/etc/php/conf.d/custom.ini \
    && echo "max_execution_time = 300" >> /usr/local/etc/php/conf.d/custom.ini \
    && echo "max_input_time = 300" >> /usr/local/etc/php/conf.d/custom.ini \
    && echo "date.timezone = Asia/Kolkata" >> /usr/local/etc/php/conf.d/custom.ini

WORKDIR /var/www/html

# Copy application files
COPY . /var/www/html/

# Create symlink so that BOTH https://api.sadhuvandna.co.in/ AND https://api.sadhuvandna.co.in/Api/ work seamlessly
RUN cd /var/www/html/Api && ln -sf . Api

# Ensure proper permissions and create symlink for /uploads to work
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && mkdir -p /var/www/html/Api/uploads \
    && chmod -R 777 /var/www/html/Api/uploads \
    && ln -sf /var/www/html/Api/uploads /var/www/html/uploads

# Expose port 80 for Coolify
EXPOSE 80

CMD ["apache2-foreground"]
